export async function upsertLicitacaoUnidade(base44, licitacaoId, unidadeId, campos = {}) {
  if (!licitacaoId || !unidadeId) throw new Error("Licitação e unidade são obrigatórias");

  const existentes = await base44.asServiceRole.entities.LicitacaoUnidade.filter({
    licitacao_id: licitacaoId,
    unidade_negocio_id: unidadeId,
  });

  if (existentes[0]) {
    return await base44.asServiceRole.entities.LicitacaoUnidade.update(existentes[0].id, campos);
  }

  return await base44.asServiceRole.entities.LicitacaoUnidade.create({
    licitacao_id: licitacaoId,
    unidade_negocio_id: unidadeId,
    favorito: false,
    oculto: false,
    status: "interessado",
    status_leitura: "nova",
    salva_manualmente: false,
    ...campos,
  });
}