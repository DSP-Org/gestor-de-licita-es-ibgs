import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Guarda uma licitação individual no Banco de Licitação (ConsultaCache),
// de forma permanente (não expira com a busca que a originou). Assim, quando
// qualquer usuário salva uma licitação, ela passa a alimentar o banco global
// compartilhado, ajudando a economizar chamadas futuras à API.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const licitacao = await req.json().catch(() => null);
    if (!licitacao || !licitacao.id_licitacao) {
      return Response.json({ error: 'Licitação inválida' }, { status: 400 });
    }

    const chave = `lic_${licitacao.id_licitacao}`;
    const expira_em = new Date(Date.now() + 10 * 365 * 24 * 3600000).toISOString(); // 10 anos

    const existentes = await base44.asServiceRole.entities.ConsultaCache.filter({ chave });
    if (existentes[0]) {
      await base44.asServiceRole.entities.ConsultaCache.update(existentes[0].id, {
        resultado: { licitacoes: [licitacao] },
        expira_em,
      });
    } else {
      await base44.asServiceRole.entities.ConsultaCache.create({
        chave,
        resultado: { licitacoes: [licitacao] },
        expira_em,
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}