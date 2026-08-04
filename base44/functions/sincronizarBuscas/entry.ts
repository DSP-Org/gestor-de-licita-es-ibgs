import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { consultarAlertaLicitacao, datasParaSincronizar, filtrarPorTodasPalavras } from "../../shared/alertaApi.ts";
import { enviarTelegram } from "../../shared/telegram.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const appUrl = (secrets.get("APP_URL") || "").replace(/\/$/, "");

    // Se houver usuário autenticado, exige admin (invocação manual);
    // se não houver (chamada via workflow agendado), prossegue com service role.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const buscasAtivas = await base44.asServiceRole.entities.BuscaSalva.filter({ ativa: true });
    const buscas = payload.buscaId
      ? buscasAtivas.filter((busca) => busca.id === payload.buscaId)
      : buscasAtivas;
    let buscasProcessadas = 0;
    let totalNovas = 0;
    const resumo = [];

    for (const busca of buscas) {
      try {
        // Consulta por data de inserção: a API devolve apenas licitações novas,
        // então não se paga novamente por resultados já sincronizados.
        const lics = [];
        let erroBusca = null;
        for (const data_insercao of datasParaSincronizar(busca.ultima_sincronizacao)) {
          for (let pagina = 1; pagina <= 5; pagina++) {
            const data = await consultarAlertaLicitacao({
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
            lics.push(...(data.licitacoes || []));
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

        const existentes = await base44.asServiceRole.entities.Licitacao.filter({ created_by_id: busca.created_by_id });
        const existIds = new Set(existentes.map((l) => l.id_licitacao));

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
            usuario_id: busca.created_by_id,
            salva_manualmente: false,
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
                    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">Enviado pelo Gestor de Licitações IBGS</p>
                    <p style="margin:0;font-size:11px;color:#9ca3af;">Desenvolvido por Data5 Tecnologia — Todos os direitos reservados</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body></html>`;

          // E-mail aos destinatários selecionados (ou ao dono da busca)
          if (busca.notificar_email !== false) {
            try {
              const ids = Array.isArray(busca.destinatarios_email) && busca.destinatarios_email.length > 0
                ? busca.destinatarios_email
                : [busca.created_by_id];
              for (const uid of ids) {
                try {
                  const u = await base44.asServiceRole.entities.User.get(uid);
                  if (u && u.email) {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                      to: u.email,
                      subject: `Novas licitações encontradas — ${busca.nome}`,
                      body: corpo,
                    });
                  }
                } catch {}
              }
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