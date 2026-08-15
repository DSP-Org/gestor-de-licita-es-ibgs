import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { datasParaSincronizar, filtrarPorTodasPalavras } from "../../shared/alertaApi.ts";
import { consultarComCache } from "../../shared/consultaCache.ts";
import { enviarTelegram } from "../../shared/telegram.ts";
import { enviarEmailExterno } from "../../shared/email.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const appUrl = (secrets.get("APP_URL") || "").replace(/\/$/, "");

    // Usuário autenticado sincroniza apenas as próprias buscas (admin sincroniza todas).
    // Sem usuário (workflow agendado) processa todas as buscas ativas.
    const user = await base44.auth.me().catch(() => null);

    const payload = await req.json().catch(() => ({}));
    const todasAtivas = await base44.asServiceRole.entities.BuscaSalva.filter({ ativa: true });
    const buscasAtivas = user && user.role !== 'admin'
      ? todasAtivas.filter((b) => b.created_by_id === user.id || b.usuario_id === user.id)
      : todasAtivas;
    const idsSelecionados = Array.isArray(payload.buscaIds)
      ? payload.buscaIds
      : payload.buscaId ? [payload.buscaId] : null;
    let buscas = idsSelecionados
      ? buscasAtivas.filter((busca) => idsSelecionados.includes(busca.id))
      : buscasAtivas;

    // Sem buscaIds significa execução agendada pelo workflow. A sincronização
    // manual sempre traz buscaIds e ignora este filtro, então o botão funciona a
    // qualquer hora.
    //
    // O critério é "já passou do horário e ainda não sincronizou hoje", e não
    // "a hora atual é exatamente a configurada". A diferença importa: o CLI do
    // Base44 não publica workflows, então o cron em produção pode não ter todos
    // os horários que a interface oferece. Com a comparação exata, uma busca
    // marcada para um horário fora do cron nunca rodaria — silenciosamente. Com
    // este critério ela roda no primeiro disparo seguinte, no pior caso mais
    // tarde do que o pedido, mas nunca deixa de rodar.
    if (!idsSelecionados) {
      // formatToParts evita variações de locale (pt-BR chega a devolver "14 h").
      const partes = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      const parte = (tipo) => (partes.find((p) => p.type === tipo)?.value || "").padStart(2, "0");
      const agora = `${parte("hour")}:${parte("minute")}`;
      const hojeSP = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

      buscas = buscas.filter((busca) => {
        const horario = String(busca.horario_sincronizacao || "09:00").slice(0, 5);

        if (!busca.ultima_sincronizacao) return true;
        const ultima = new Date(busca.ultima_sincronizacao);
        const jaRodouHoje =
          ultima.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) === hojeSP;
        if (jaRodouHoje) return false;

        if (agora >= horario) return true;

        // Rede de segurança. Se o cron não tiver nenhum disparo depois do horário
        // escolhido — o CLI não publica workflows, então o agendamento em produção
        // pode não cobrir todos os horários da interface — a condição acima nunca
        // seria verdadeira e a busca ficaria parada para sempre.
        //
        // O limiar precisa passar de 24h. Abaixo disso ele venceria a corrida com
        // o horário configurado: numa operação diária normal, o primeiro disparo
        // do dia já está a mais de 20h da véspera, e toda busca rodaria ali,
        // ignorando o horário escolhido.
        return Date.now() - ultima.getTime() >= 26 * 60 * 60 * 1000;
      });
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
              usuario_id: donoId,
              id_licitacao: { $in: idsPesquisa },
            })
          : [];
        const existIds = new Set(existentes.map((l) => l.id_licitacao));

        const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

        const novas = resultados
          .filter((l) => !existIds.has(l.id_licitacao))
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
            salva_manualmente: false,
            data_sincronizacao: hoje,
            data_publicacao: l._dataInsercao || hoje,
            status_leitura: "nova",
          }));

        if (novas.length > 0) {
          await base44.asServiceRole.entities.Licitacao.bulkCreate(novas);
          totalNovas += novas.length;

          // Monta o corpo da notificação em HTML
          const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

          // Cria resultado compartilhado com código único
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
                  <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">${i + 1}. ${esc(l.titulo)}</p>
                  <p style="margin:0 0 6px;font-size:13px;color:#4b5563;">${esc(local) || "—"} · Abertura: ${esc(l.abertura) || "—"}</p>
                </td></tr>
              </table>
            </td></tr>`;
          }).join("");
          const botaoCompartilhar = linkCompartilhamento
            ? `<tr><td style="padding:8px 24px 20px;">
                <a href="${esc(linkCompartilhamento)}" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Ver todas as licitações no painel →</a>
              </td></tr>`
            : "";
          const corpo = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
              <tr><td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
                  <tr><td style="background:#111827;padding:24px;">
                    <h1 style="margin:0;color:#ffffff;font-size:18px;">🔔 Novas licitações encontradas</h1>
                    <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Busca: ${esc(busca.nome)}</p>
                  </td></tr>
                  <tr><td style="padding:20px 24px 8px;">
                    <p style="margin:0;font-size:14px;color:#374151;">Foram encontradas <b>${novas.length} nova(s) licitação(oes)</b> para a sua busca:</p>
                  </td></tr>
                  ${cards}
                  ${novas.length > 10 ? `<tr><td style="padding:0 24px 8px;font-size:13px;color:#6b7280;">... e mais ${novas.length - 10} licitação(oes). Acesse o painel para visualizar todas.</td></tr>` : ""}
                  ${botaoCompartilhar}
                  <tr><td style="padding:16px 24px 24px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">Enviado pelo Licitalerta360</p>
                    <p style="margin:0;font-size:11px;color:#9ca3af;">Desenvolvido por Data5 Tecnologia — Todos os direitos reservados</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body></html>`;

          // E-mail aos destinatários selecionados (ou ao dono da busca).
          // destinatarios_email hoje guarda endereços vindos da agenda Destinatario,
          // mas buscas antigas ainda guardam IDs de User. Aceitamos os dois: se o
          // valor tem "@" é endereço, senão é ID e precisa ser resolvido.
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
                } catch {}
              }
              for (const to of [...new Set(enderecos)]) {
                try {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to,
                    subject: `Novas licitações encontradas — ${busca.nome}`,
                    body: corpo,
                  });
                } catch {}
              }
            } catch {}
          }

          // Destinatários externos (e-mails fora do sistema)
          const externos = Array.isArray(busca.destinatarios_extras) ? busca.destinatarios_extras : [];
          if (externos.length > 0) {
            try {
              await enviarEmailExterno(externos, `Novas licitações encontradas — ${busca.nome}`, corpo);
            } catch {}
          }

          // Telegram
          if (busca.telegram_chats) {
            try {
              const corpoTg = `<b>🔔 ${novas.length} nova(s) licitação(oes) — ${busca.nome}</b>\n\n` +
                novas.slice(0, 5).map((l, i) =>
                  `${i + 1}. <b>${l.titulo}</b>\n${l.uf || ""} - ${l.municipio || ""} | Abertura: ${l.abertura || "—"}`
                ).join("\n\n") +
                (novas.length > 5 ? `\n\n... e mais ${novas.length - 5}.` : "") +
                (linkCompartilhamento ? `\n\n🔗 Ver todas no painel: ${linkCompartilhamento}` : "");
              await enviarTelegram(busca.telegram_chats, corpoTg);
            } catch {}
          }
        }

        await base44.asServiceRole.entities.BuscaSalva.update(busca.id, {
          ultima_sincronizacao: new Date().toISOString(),
          total_encontrado: resultados.length,
        });
        buscasProcessadas++;
        resumo.push({ busca: busca.nome, novas: novas.length, total: resultados.length });
      } catch (e) {
        resumo.push({ busca: busca.nome, erro: e.message });
      }
    }

    return Response.json({ ok: true, buscasProcessadas, totalNovas, resumo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}