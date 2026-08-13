// Monta o filtro de propriedade usado nas consultas do cliente.
//
// O RLS do backend já restringe cada usuário aos próprios registros, então para
// um usuário comum este escopo é redundante. Ele existe por causa do master, que
// enxerga tudo e precisa estreitar a visão para o usuário escolhido no seletor
// do Layout — sem isso, listas montadas com .list() devolvem dados de todos.
//
// Atenção ao campo de dono: Licitacao e BuscaSalva têm usuario_id (permitindo que
// o admin configure algo em nome de outro) e created_by_id. Destinatario e
// FavoritaLista têm apenas created_by_id — filtrar por usuario_id nelas produz
// uma cláusula que nunca casa.
export function escopoUsuario(isAdmin, filtroUsuario, { comUsuarioId = true } = {}) {
  if (isAdmin && filtroUsuario === "todos") return {};
  if (!filtroUsuario) return {};
  return comUsuarioId
    ? { $or: [{ usuario_id: filtroUsuario }, { created_by_id: filtroUsuario }] }
    : { created_by_id: filtroUsuario };
}

// Açúcar para entidades que só têm created_by_id.
export function escopoPorCriador(isAdmin, filtroUsuario) {
  return escopoUsuario(isAdmin, filtroUsuario, { comUsuarioId: false });
}
