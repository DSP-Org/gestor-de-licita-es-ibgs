import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { datasParaSincronizar, filtrarPorTodasPalavras } from "../../shared/alertaApi.ts";
import { consultarComCache } from "../../shared/consultaCache.ts";
import { enviarTelegram } from "../../shared/telegram.ts";
import { enviarEmailExterno } from "../../shared/email.ts";
import { hojeSP, escapaHTML, criaEmailTemplate } from "../../shared/utils.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const appUrl = (secrets.get("APP_URL") || "").replace(/\/$/, "");

    // Usuário autenticado sincroniza as buscas da própria unidade de negócio
    // (admin sincroniza todas). Sem usuário (workflow agendado) processa todas
    // as buscas ativas.
    const user = await base44.auth.me().catch(() => null);

    const payload = await req.json().catch(() => ({}));
    const todasAtivas = await base44.asServiceRole.entities.BuscaSalva.filter({ ativa: true });
    const buscasAtivas = user && user.role !== 'admin'
      ? todasAtivas.filter((b) => b.unidade_negocio_id === user.unidade_negocio_id)
      : todasAtivas;
    const idsSelecionados = Array.isArray(payload.buscaIds)
      ? payload.buscaIds
      : payload.buscaId ? [payload.buscaId] : null;
    let buscas = idsSelecionados
      ? buscasAtivas.filter((busca) => idsSelecionados.includes(busca.id))
      : buscasAtivas;

    // Sem buscaIds significa execução agendada pelo workflow. O cron dispara nos
    // horários oferecidos pela interface, e aqui cada busca só roda no horário
    // que o usuário configurou. Sincronização manual sempre traz buscaIds e
    // portanto ignora este filtro — o botão funciona a qualquer hora.
    if (!idsSelecionados) {
      // formatToParts evita variações de locale (pt-BR chega a devolver "14 h").
      const partes = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      const horaAtual = (partes.find((p) => p.type === "hour")?.value || "").padStart(2, "0");
      buscas = buscas.filter(
        (busca) => String(busca.horario_sincronizacao || "09:00").slice(0, 2).padStart(2, "0") === horaAtual,
      );
    }
    let buscasProcessadas = 0;
    let totalNovas = 0;
    const resumo = [];

    for (const busca of buscas) {
      try {
        const donoId = busca.usuario_id || busca.created_by_id;

        // Se a busca tiver sido sincronizada há menos de 5 minutos, pular para economizar banco e API (salvo se payload.force === true)
        if (busca.ultima_sincronizacao && payload.force !== true) {
          const diffMs = Date.now() - new Date(busca.ultima_sincronizacao).getTime();
          const cooldownMs = 5 * 60 * 1000; // 5 minutos
          if (diffMs < cooldownMs) {
            buscasProcessadas++;
            resumo.push({ busca: busca.nome, novas: 0, ignorada: "cooldown", mensagem: "Sincronizada recentemente (menos de 5 min)" });
            continue;
          }
        }

        // Consulta por data de inserção: a API devolve apenas licitações novas,
        // então não se paga novamente por resultados já sincronizados.
        // O cache persistente (ConsultaCache) também evita repetir a mesma
        // chamada quando outra busca (do mesmo usuário ou de outro) usa os
        // mesmos filtros e data.
        const lics = [];
        let erroBusca = null;
        for (const data_insercao of datasParaSincronizar(busca.ultima_sincronizacao)) {
          for (let pagina = 1; pagina <= 5; pagina++) {
            const data = await consultarComCache(base44, {
              uf: busca.uf,
              palavra_chave: busca.palavra_chave,
              modalidade: busca.modalidade,
              municipio_ibge: busca.municipio_ibge,
              data_insercao,
              pagina,
              licitacoesPorPagina: 100,
            });
            if (data.totalErros > 0) {
              erroBusca = data.erros.map((e) => e.descricao).join("; ");
              break;
            }
            // A resposta da API não traz data de publicação. Como a consulta é
            // feita por data de inserção, a data que pedimos é justamente o dia
            // em que a licitação entrou — carimbamos aqui para não perder isso.
            lics.push(...(data.licitacoes || []).map((l) => ({ ...l, _dataInsercao: data_insercao })));
            if (pagina >= (Number(data.paginas) || 1)) break;
          }
          if (erroBusca) break;
        }

        if (erroBusca) {
          resumo.push({ busca: busca.nome, erro: erroBusca });
          continue;
        }
        // Modo restritivo: exige todas as palavras-chave no título/objeto
        const resultados = busca.modo_palavras === "todas"
          ? filtrarPorTodasPalavras(lics, busca.palavra_chave)
          : lics;

        // Otimização: Filtra no banco apenas as licitações com id_licitacao pertencentes aos resultados atuais
        const idsPesquisa = resultados.map((l) => l.id_licitacao).filter(Boolean);
        const existentes = idsPesquisa.length > 0
          ? await base44.asServiceRole.entities.Licitacao.filter({
              unidade_negocio_id: busca.unidade_negocio_id,
              id_licitacao: { $in: idsPesquisa },
            })
          : [];
        const existIds = new Set(existentes.map((l) => l.id_licitacao));

        const agora = new Date();
        const hojeZeroHora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

        const novas = resultados
          .filter((l) => {
            if (existIds.has(l.id_licitacao)) return false;
            // Se tiver data de abertura definida, ignora se já venceu (abertura < hoje)
            if (l.abertura_datetime) {
              const dtAbertura = new Date(l.abertura_datetime);
              if (!isNaN(dtAbertura.getTime()) && dtAbertura < hojeZeroHora) {
                return false;
              }
            }
            return true;
          })
          .map((l) => ({
            id_licitacao: l.id_licitacao,
            titulo: l.titulo,
            objeto: l.objeto,
            uf: l.uf,
            municipio: l.municipio,
            municipio_ibge: l.municipio_IBGE,
            orgao: l.orgao,
            abertura_datetime: l.abertura_datetime,
            abertura: l.abertura,
            tipo: l.tipo,
            id_tipo: l.id_tipo,
            valor: l.valor,
            link: l.link,
            link_externo: l.linkExterno,
            status: "interessado",
            favorito: false,
            busca_origem: busca.nome,
            usuario_id: donoId,
            unidade_negocio_id: busca.unidade_negocio_id,
            salva_manualmente: false,
            data_sincronizacao: hoje,
            data_publicacao: l._dataInsercao || hoje,
            status_leitura: "nova",
          }));

        if (novas.length > 0) {
          await base44.asServiceRole.entities.Licitacao.bulkCreate(novas);
          totalNovas += novas.length;

          const codigo = crypto.randomUUID();
          const linkCompartilhamento = appUrl ? `${appUrl}/compartilhar/${codigo}` : "";
          try {
            await base44.asServiceRole.entities.ResultadoCompartilhado.create({
              codigo,
              busca_nome: busca.nome,
              licitacoes: novas.map((l) => ({
                id_licitacao: l.id_licitacao,
                titulo: l.titulo,
                objeto: l.objeto,
                orgao: l.orgao,
                uf: l.uf,
                municipio: l.municipio,
                abertura: l.abertura,
                tipo: l.tipo,
                valor: l.valor,
                link: l.link,
                link_externo: l.link_externo,
              })),
            });
          } catch {}

          const cards = novas.slice(0, 10).map((l, i) => {
            const local = [l.uf, l.municipio].filter(Boolean).join(" - ");
            return `<tr><td style="padding:0 24px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <tr><td style="padding:16px;">
                  <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">${i + 1}. ${escapaHTML(l.titulo)}</p>
                  <p style="margin:0 0 6px;font-size:13px;color:#4b5563;">${escapaHTML(local) || "—"} · Abertura: ${escapaHTML(l.abertura) || "—"}</p>
                </td></tr>
              </table>
            </td></tr>`;
          }).join("");

          const corpo = criaEmailTemplate(busca.nome, cards, novas.length, linkCompartilhamento);

          // E-mail aos destinatários selecionados (ou ao dono da busca).
          if (busca.notificar_email !== false) {
            try {
              const valores = Array.isArray(busca.destinatarios_email) && busca.destinatarios_email.length > 0
                ? busca.destinatarios_email
                : [donoId];
              const enderecos = [];
              for (const valor of valores) {
                if (typeof valor === "string" && valor.includes("@")) {
                  enderecos.push(valor);
                  continue;
                }
                try {
                  const u = await base44.asServiceRole.entities.User.get(valor);
                  if (u && u.email) enderecos.push(u.email);
                } catch (e) {
                  console.warn(`[Email] Usuário ${valor} não encontrado`);
                }
              }
              for (const to of [...new Set(enderecos)]) {
                try {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to,
                    subject: `Novas licitações encontradas — ${busca.nome}`,
                    body: corpo,
                  });
                } catch (e) {
                  console.error(`[Email] Erro ao enviar para ${to}:`, e instanceof Error ? e.message : String(e));
                }
              }
            } catch (e) {
              console.error(`[Email] Erro geral na busca ${busca.nome}:`, e instanceof Error ? e.message : String(e));
            }
          }

          // Destinatários externos (e-mails fora do sistema)
          const externos = Array.isArray(busca.destinatarios_extras) ? busca.destinatarios_extras : [];
          if (externos.length > 0) {
            try {
              await enviarEmailExterno(externos, `Novas licitações encontradas — ${busca.nome}`, corpo);
            } catch (e) {
              console.error(`[Email Externo] Erro na busca ${busca.nome}:`, e instanceof Error ? e.message : String(e));
            }
          }

          // Telegram
          if (busca.telegram_chats) {
            try {
              const corpoTg = `<b>🔔 ${novas.length} nova(s) licitação(oes) — ${busca.nome}</b>\n\n` +
                novas.slice(0, 5).map((l, i) =>
                  `${i + 1}. <b>${escapaHTML(l.titulo)}</b>\n${l.uf || ""} - ${l.municipio || ""} | Abertura: ${l.abertura || "—"}`
                ).join("\n\n") +
                (novas.length > 5 ? `\n\n... e mais ${novas.length - 5}.` : "") +
                (linkCompartilhamento ? `\n\n🔗 Ver todas no painel: ${linkCompartilhamento}` : "");
              await enviarTelegram(busca.telegram_chats, corpoTg);
            } catch (e) {
              console.error(`[Telegram] Erro na busca ${busca.nome}:`, e instanceof Error ? e.message : String(e));
            }
          }
        }

        // Housekeeping / Descarte automático: oculta licitações vencidas que não foram favoritadas
        try {
          const licsUnidade = await base44.asServiceRole.entities.Licitacao.filter({
            unidade_negocio_id: busca.unidade_negocio_id,
            favorito: false,
            status: "interessado",
            oculto: { $ne: true },
          }, "-created_date", 200);

          const vencidasParaOcultar = toArray(licsUnidade).filter((l) => {
            if (!l.abertura_datetime) return false;
            const dt = new Date(l.abertura_datetime);
            return !isNaN(dt.getTime()) && dt < hojeZeroHora;
          });

          if (vencidasParaOcultar.length > 0) {
            await base44.asServiceRole.entities.Licitacao.bulkUpdate(
              vencidasParaOcultar.map((l) => ({ id: l.id, oculto: true, status: "vencida" }))
            );
          }
        } catch (errLimpeza) {
          console.warn(`[Housekeeping] Erro ao limpar vencidas para busca ${busca.nome}:`, errLimpeza);
        }

        await base44.asServiceRole.entities.BuscaSalva.update(busca.id, {
          ultima_sincronizacao: new Date().toISOString(),
          total_encontrado: resultados.length,
        });
        buscasProcessadas++;
        resumo.push({ busca: busca.nome, novas: novas.length, total: resultados.length });
      } catch (e) {
        const erroMsg = e instanceof Error ? e.message : String(e);
        console.error(`[Sincronizacao] Erro na busca ${busca.nome}:`, erroMsg);
        resumo.push({ busca: busca.nome, erro: erroMsg });
      }
    }

    return Response.json({ ok: true, buscasProcessadas, totalNovas, resumo });
  } catch (error) {
    const erroMsg = error instanceof Error ? error.message : String(error);
    console.error("[Sincronizacao] Erro geral:", erroMsg);
    return Response.json({ error: erroMsg }, { status: 500 });
  }
}