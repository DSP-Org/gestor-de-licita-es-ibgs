import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { datasParaSincronizar, filtrarPorTodasPalavras } from "../../shared/alertaApi.ts";
import { consultarComCache } from "../../shared/consultaCache.ts";
import { enviarTelegram } from "../../shared/telegram.ts";
import { enviarEmailExterno } from "../../shared/email.ts";
import { hojeSP, dataSP, escapaHTML, criaEmailTemplate } from "../../shared/utils.ts";

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
    let horaAtual = null;
    if (!idsSelecionados) {
      // formatToParts evita variações de locale (pt-BR chega a devolver "14 h").
      const partes = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      horaAtual = (partes.find((p) => p.type === "hour")?.value || "").padStart(2, "0");
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

        const hoje = hojeSP();
        const hojeZeroHora = new Date(`${hoje}T00:00:00-03:00`);

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

        // Housekeeping / Descarte automático: oculta licitações vencidas que não
        // foram favoritadas, em qualquer estágio do funil (nova ou em triagem).
        //
        // O filtro de abertura_datetime vai direto na consulta — antes buscava
        // as 200 licitações mais recentes da unidade e filtrava vencida em
        // memória, então qualquer atraso na limpeza (ex: busca desativada que
        // parou de rodar por um tempo) deixava um acúmulo de vencidas antigas
        // fora da janela dos 200 mais recentes, nunca mais alcançadas.
        try {
          const vencidasParaOcultar = await base44.asServiceRole.entities.Licitacao.filter({
            unidade_negocio_id: busca.unidade_negocio_id,
            favorito: false,
            oculto: { $ne: true },
            abertura_datetime: { $lt: hojeZeroHora.toISOString() },
          }, "-abertura_datetime", 2000);

          if (vencidasParaOcultar.length > 0) {
            await base44.asServiceRole.entities.Licitacao.bulkUpdate(
              vencidasParaOcultar.map((l) => ({ id: l.id, oculto: true, status: "vencida" }))
            );
          }
        } catch (errLimpeza) {
          console.warn(`[Housekeeping] Erro ao limpar vencidas para busca ${busca.nome}:`, errLimpeza);
        }

        // Auto-triagem: licitação "nova" há mais de 3 dias sem ação do usuário
        // (não favoritada, não descartada) é promovida automaticamente para Em Triagem.
        try {
          const limiteAutoTriagem = dataSP(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));

          const novasParaTriagem = await base44.asServiceRole.entities.Licitacao.filter({
            unidade_negocio_id: busca.unidade_negocio_id,
            status_leitura: "nova",
            favorito: { $ne: true },
            oculto: { $ne: true },
            data_sincronizacao: { $lte: limiteAutoTriagem },
          }, "-created_date", 2000);

          if (novasParaTriagem.length > 0) {
            await base44.asServiceRole.entities.Licitacao.bulkUpdate(
              novasParaTriagem.map((l) => ({ id: l.id, status_leitura: "vista", status: "em_analise" }))
            );
          }
        } catch (errAutoTriagem) {
          console.warn(`[AutoTriagem] Erro ao promover novas para triagem na busca ${busca.nome}:`, errAutoTriagem);
        }

        // Alerta de Prazo Crítico (≤ 24h a 48h): notifica sobre pregões iminentes favoritados
        try {
          if (busca.notificar_email !== false) {
            const limitePrazoCritico = new Date(hojeZeroHora.getTime() + 48 * 60 * 60 * 1000); // próximas 48h

            const favoritadasAtivas = await base44.asServiceRole.entities.Licitacao.filter({
              unidade_negocio_id: busca.unidade_negocio_id,
              favorito: true,
              status: { $in: ["interessado", "acompanhando", "participando"] },
              oculto: { $ne: true },
            }, "-abertura_datetime", 100);

            const criticas = (favoritadasAtivas || []).filter((l) => {
              if (!l.abertura_datetime) return false;
              const dt = new Date(l.abertura_datetime);
              return !isNaN(dt.getTime()) && dt >= hojeZeroHora && dt <= limitePrazoCritico;
            });

            if (criticas.length > 0) {
              const cardsCriticos = criticas.map((l, i) => {
                const dt = new Date(l.abertura_datetime);
                const ehHoje = dt < new Date(hojeZeroHora.getTime() + 24 * 60 * 60 * 1000);
                const badgeLabel = ehHoje ? "🚨 ABRE HOJE" : "⚠️ ABRE AMANHÃ";
                const badgeBg = ehHoje ? "#ef4444" : "#f59e0b";

                return `<tr><td style="padding:0 24px 12px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid ${badgeBg};border-radius:8px;">
                    <tr><td style="padding:16px;">
                      <div style="margin-bottom:8px;">
                        <span style="background:${badgeBg};color:#ffffff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:9999px;">${badgeLabel}</span>
                      </div>
                      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">${i + 1}. ${escapaHTML(l.titulo)}</p>
                      <p style="margin:0 0 6px;font-size:13px;color:#4b5563;">Órgão: ${escapaHTML(l.orgao) || "—"} · ${escapaHTML(l.uf || "")} - ${escapaHTML(l.municipio || "")}</p>
                      <p style="margin:0;font-size:13px;color:#1f2937;font-weight:600;">Data/Hora Abertura: ${escapaHTML(l.abertura) || "—"}</p>
                    </td></tr>
                  </table>
                </td></tr>`;
              }).join("");

              const corpoCritico = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <tr><td style="background:#b91c1c;padding:24px;">
          <h1 style="margin:0;color:#ffffff;font-size:18px;">⚠️ ALERTA DE PREGÃO IMINENTE (≤ 24h/48h)</h1>
          <p style="margin:4px 0 0;color:#fca5a5;font-size:13px;">Unidade / Busca: ${escapaHTML(busca.nome)}</p>
        </td></tr>
        <tr><td style="padding:20px 24px 12px;">
          <p style="margin:0;font-size:14px;color:#374151;">Você possui <b>${criticas.length} licitação(ões) favoritada(s)</b> com abertura nas próximas 24h a 48h. Prepare sua proposta e certidões:</p>
        </td></tr>
        ${cardsCriticos}
        <tr><td style="padding:16px 24px 24px;">
          <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">Alerta Automático Licitalerta360</p>
          <p style="margin:0;font-size:11px;color:#9ca3af;">Data5 Tecnologia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

              const valores = Array.isArray(busca.destinatarios_email) && busca.destinatarios_email.length > 0
                ? busca.destinatarios_email
                : [donoId];
              const destinatariosAlerta = [];
              for (const v of valores) {
                if (typeof v === "string" && v.includes("@")) {
                  destinatariosAlerta.push(v);
                  continue;
                }
                try {
                  const u = await base44.asServiceRole.entities.User.get(v);
                  if (u?.email) destinatariosAlerta.push(u.email);
                } catch (_) {}
              }

              for (const to of [...new Set(destinatariosAlerta)]) {
                try {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to,
                    subject: `⚠️ ALERTA DE PREGÃO IMINENTE (${criticas.length}) — ${busca.nome}`,
                    body: corpoCritico,
                  });
                } catch (eSend) {
                  console.error(`[Alerta Critico] Erro ao enviar para ${to}:`, eSend);
                }
              }
            }
          }
        } catch (errCritico) {
          console.warn(`[Alerta Critico] Erro ao processar alertas de prazo para busca ${busca.nome}:`, errCritico);
        }

        await base44.asServiceRole.entities.BuscaSalva.update(busca.id, {
          ultima_sincronizacao: new Date().toISOString(),
          total_encontrado: resultados.length,
          ultima_execucao_status: "sucesso",
          ultimo_erro: null,
        });
        buscasProcessadas++;
        resumo.push({ busca: busca.nome, novas: novas.length, total: resultados.length });
      } catch (e) {
        const erroMsg = e instanceof Error ? e.message : String(e);
        console.error(`[Sincronizacao] Erro na busca ${busca.nome}:`, erroMsg);
        try {
          await base44.asServiceRole.entities.BuscaSalva.update(busca.id, {
            ultima_sincronizacao: new Date().toISOString(),
            ultima_execucao_status: "erro",
            ultimo_erro: erroMsg,
          });
        } catch (updateErr) {
          console.error(`[Sincronizacao] Falha ao persistir status de erro na busca ${busca.nome}:`, updateErr);
        }
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