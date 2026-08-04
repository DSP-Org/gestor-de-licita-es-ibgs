import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { consultarAlertaLicitacao } from "../../shared/alertaApi.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Se houver usuário autenticado, exige admin (invocação manual);
    // se não houver (chamada via workflow agendado), prossegue com service role.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const buscas = await base44.asServiceRole.entities.BuscaSalva.filter({ ativa: true });
    let buscasProcessadas = 0;
    let totalNovas = 0;
    const resumo = [];

    for (const busca of buscas) {
      try {
        const data = await consultarAlertaLicitacao({
          uf: busca.uf,
          palavra_chave: busca.palavra_chave,
          modalidade: busca.modalidade,
          municipio_ibge: busca.municipio_ibge,
          pagina: 1,
          licitacoesPorPagina: busca.licitacoes_por_pagina || 50,
        });

        if (data.totalErros > 0) {
          resumo.push({ busca: busca.nome, erro: data.erros.map((e) => e.descricao).join("; ") });
          continue;
        }

        const lics = data.licitacoes || [];
        const existentes = await base44.asServiceRole.entities.Licitacao.filter({ created_by_id: busca.created_by_id });
        const existIds = new Set(existentes.map((l) => l.id_licitacao));

        const novas = lics
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
            created_by_id: busca.created_by_id,
          }));

        if (novas.length > 0) {
          await base44.asServiceRole.entities.Licitacao.bulkCreate(novas);
          totalNovas += novas.length;

          // Envia notificação por e-mail ao dono da busca (se habilitado)
          if (busca.notificar_email !== false) {
            try {
              const usuario = await base44.asServiceRole.entities.User.get(busca.created_by_id);
              if (usuario && usuario.email) {
              const linhas = novas.slice(0, 10).map((l, i) =>
                `${i + 1}. ${l.titulo}\n   ${l.uf || ""} - ${l.municipio || ""} | Abertura: ${l.abertura || "—"}\n   ${l.link || ""}`
              ).join("\n\n");
              const corpo = `Foram encontradas ${novas.length} nova(s) licitação(ões) para a busca "${busca.nome}":\n\n${linhas}` +
                (novas.length > 10 ? `\n\n... e mais ${novas.length - 10} licitação(ões).` : "") +
                `\n\nAcesse o painel para visualizar e gerenciar.`;

                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: usuario.email,
                  subject: `Novas licitações encontradas — ${busca.nome}`,
                  body: corpo,
                });
              }
            } catch (e) {
              // e-mail falha não interrompe a sincronização
            }
          }
        }

        await base44.asServiceRole.entities.BuscaSalva.update(busca.id, {
          ultima_sincronizacao: new Date().toISOString(),
          total_encontrado: Number(data.totalLicitacoes) || 0,
        });
        buscasProcessadas++;
        resumo.push({ busca: busca.nome, novas: novas.length, total: Number(data.totalLicitacoes) || 0 });
      } catch (e) {
        resumo.push({ busca: busca.nome, erro: e.message });
      }
    }

    return Response.json({ ok: true, buscasProcessadas, totalNovas, resumo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}