// Monta o filtro de propriedade usado nas consultas do cliente.
//
// Regra única, sem exceção pra master: dado pertence a uma unidade, usuário só
// enxerga a unidade ATIVA dele (filtroUnidade). Sem unidade ativa, sem dados —
// o sentinela abaixo garante zero resultados em vez de uma consulta destravada.
// O RLS do backend aplica a mesma regra de forma independente (defesa em
// profundidade): mesmo que este filtro do cliente falhe, o servidor barra.
export function escopoUnidade(_isAdmin, filtroUnidade) {
  return { unidade_negocio_id: filtroUnidade || "__sem_unidade_ativa__" };
}

// Mesma regra de dono, para filtrar listas já carregadas em memória.
export function pertenceAUnidade(registro, filtroUnidade) {
  return !!filtroUnidade && registro.unidade_negocio_id === filtroUnidade;
}

// Unidade a atribuir em registros criados agora: sempre a unidade ativa do
// usuário logado (inclusive admin — trocar de unidade vale pra tudo).
export function unidadeEfetiva(_isAdmin, filtroUnidade, usuarioLogado) {
  return filtroUnidade || usuarioLogado?.unidade_negocio_id;
}
