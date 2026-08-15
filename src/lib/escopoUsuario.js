// Monta o filtro de propriedade usado nas consultas do cliente.
//
// O RLS do backend já restringe cada usuário aos próprios registros, então para
// um usuário comum este escopo é redundante. Ele existe por causa do master, que
// enxerga tudo e precisa estreitar a visão para o usuário escolhido no seletor
// do Layout — sem isso, listas montadas com .list() devolvem dados de todos.
//
// Todas as entidades com dono (Licitacao, BuscaSalva, FavoritaLista,
// Destinatario) têm os dois campos: created_by_id (quem criou o registro) e
// usuario_id (para quem ele foi criado — preenchido quando o master age em nome
// de outro usuário).
export function escopoUsuario(isAdmin, filtroUsuario) {
  if (isAdmin && filtroUsuario === "todos") return {};
  if (!filtroUsuario) return {};
  // usuario_id, quando preenchido, é o dono autoritativo; created_by_id só vale
  // como dono na ausência dele. Sem essa distinção, tudo que o master criasse em
  // nome de outros continuaria aparecendo na visão do próprio master.
  return {
    $or: [
      { usuario_id: filtroUsuario },
      { created_by_id: filtroUsuario, usuario_id: null },
    ],
  };
}

// Mesma regra de dono, para filtrar listas já carregadas em memória.
export function pertenceAoUsuario(registro, filtroUsuario) {
  if (filtroUsuario === "todos") return true;
  if (registro.usuario_id) return registro.usuario_id === filtroUsuario;
  return registro.created_by_id === filtroUsuario;
}

// Dono a atribuir em registros criados agora. Quando o master está com um
// usuário escolhido no seletor, toda ação vale para aquele usuário — o registro
// nasce com usuario_id dele, senão ficaria preso ao master via created_by_id e
// o usuário nunca o veria (o RLS dele filtra pelos próprios ids).
export function donoEfetivo(isAdmin, filtroUsuario, usuarioLogado) {
  if (isAdmin && filtroUsuario && filtroUsuario !== "todos") return filtroUsuario;
  return usuarioLogado?.id;
}
