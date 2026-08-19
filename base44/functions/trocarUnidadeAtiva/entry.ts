import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Troca a unidade de negócio ATIVA do próprio usuário logado. O campo
// unidade_negocio_id (o que o RLS das entidades com dono realmente compara)
// é travado para escrita direta do usuário — só o master pode escrevê-lo via
// entities.User.update. Esta função é o único caminho para um usuário comum
// trocar sua unidade ativa, e só permite trocar para uma unidade presente em
// unidades_negocio_ids do próprio usuário (suas unidades permitidas).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { unidadeId } = await req.json().catch(() => ({}));
    if (!unidadeId) return Response.json({ error: 'unidadeId é obrigatório' }, { status: 400 });

    const permitidas = Array.isArray(user.unidades_negocio_ids) ? user.unidades_negocio_ids : [];
    if (!permitidas.includes(unidadeId)) {
      return Response.json({ error: 'Você não pertence a esta unidade.' }, { status: 403 });
    }

    await base44.asServiceRole.entities.User.update(user.id, { unidade_negocio_id: unidadeId });

    return Response.json({ ok: true, unidade_negocio_id: unidadeId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
