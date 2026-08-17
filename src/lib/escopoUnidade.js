// Monta o filtro de propriedade usado nas consultas do cliente.
//
// O RLS do backend já restringe cada usuário aos registros da própria unidade de
// negócio, então para um usuário comum este escopo é redundante. Ele existe por
// causa do master, que enxerga tudo e precisa estreitar a visão para a unidade
// escolhida no seletor do Layout — sem isso, listas montadas com .list() devolvem
// dados de todas as unidades.
//
// Todas as entidades com dono (Licitacao, BuscaSalva, FavoritaLista,
// Destinatario) têm o campo unidade_negocio_id, dono autoritativo do registro.
export function escopoUnidade(isAdmin, filtroUnidade) {
  if (isAdmin && filtroUnidade === "todos") return {};
  if (!filtroUnidade) return {};
  return { unidade_negocio_id: filtroUnidade };
}

// Mesma regra de dono, para filtrar listas já carregadas em memória.
export function pertenceAUnidade(registro, filtroUnidade) {
  if (filtroUnidade === "todos") return true;
  return registro.unidade_negocio_id === filtroUnidade;
}

// Unidade a atribuir em registros criados agora. Quando o master está com uma
// unidade escolhida no seletor, toda ação vale para aquela unidade; senão, vale
// a unidade do próprio usuário logado.
export function unidadeEfetiva(isAdmin, filtroUnidade, usuarioLogado) {
  if (isAdmin && filtroUnidade && filtroUnidade !== "todos") return filtroUnidade;
  return usuarioLogado?.unidade_negocio_id;
}
