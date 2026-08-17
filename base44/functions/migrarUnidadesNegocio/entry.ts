import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Migração única e idempotente (pode rodar mais de uma vez sem duplicar nada):
// 1. Cria uma UnidadeNegocio para cada usuário que ainda não tem uma, e vincula
//    o usuário a ela.
// 2. Faz o backfill de unidade_negocio_id nos registros das 4 entidades com dono
//    (Licitacao, BuscaSalva, FavoritaLista, Destinatario), resolvendo o dono via
//    usuario_id (ou created_by_id na ausência dele) e mapeando para a unidade
//    correspondente criada no passo 1.
const ENTIDADES_COM_DONO = ['Licitacao', 'BuscaSalva', 'FavoritaLista', 'Destinatario'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.email !== 'nailton.alsampaio@gmail.com') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usuarios = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    const unidadePorUsuario = {};
    let unidadesCriadas = 0;

    for (const u of usuarios) {
      if (u.unidade_negocio_id) {
        unidadePorUsuario[u.id] = u.unidade_negocio_id;
        continue;
      }
      const unidade = await base44.asServiceRole.entities.UnidadeNegocio.create({
        nome: u.full_name || u.email,
      });
      await base44.asServiceRole.entities.User.update(u.id, { unidade_negocio_id: unidade.id });
      unidadePorUsuario[u.id] = unidade.id;
      unidadesCriadas++;
    }

    const resumo = {};
    for (const nomeEntidade of ENTIDADES_COM_DONO) {
      const registros = await base44.asServiceRole.entities[nomeEntidade].filter({}, undefined, 5000);
      const atualizacoes = registros
        .filter((r) => !r.unidade_negocio_id)
        .map((r) => {
          const donoId = r.usuario_id || r.created_by_id;
          return donoId && unidadePorUsuario[donoId]
            ? { id: r.id, unidade_negocio_id: unidadePorUsuario[donoId] }
            : null;
        })
        .filter(Boolean);

      if (atualizacoes.length > 0) {
        await base44.asServiceRole.entities[nomeEntidade].bulkUpdate(atualizacoes);
      }
      resumo[nomeEntidade] = { total: registros.length, atualizados: atualizacoes.length };
    }

    return Response.json({ ok: true, unidadesCriadas, resumo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
