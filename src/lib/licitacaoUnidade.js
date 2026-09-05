import { base44 } from '@/api/base44Client';

export function combinarLicitacaoVinculo(licitacao, vinculo) {
  return {
    ...licitacao,
    ...(vinculo || {}),
    id: licitacao.id,
    licitacao_id: licitacao.id,
    vinculo_id: vinculo?.id || null,
    vinculo_created_date: vinculo?.created_date || null,
    vinculo_updated_date: vinculo?.updated_date || null,
  };
}

export function combinarLicitacoesVinculos(licitacoes, vinculos) {
  const porLicitacao = new Map(vinculos.map((v) => [v.licitacao_id, v]));
  return licitacoes.map((l) => combinarLicitacaoVinculo(l, porLicitacao.get(l.id)));
}

export async function atualizarVinculoLicitacao(licitacao, unidadeId, campos) {
  const licitacaoId = licitacao.licitacao_id || licitacao.id;
  const resposta = await base44.functions.invoke('atualizarVinculoLicitacao', {
    licitacaoId,
    unidadeId,
    campos,
  });
  return resposta.data?.vinculo || resposta.data;
}