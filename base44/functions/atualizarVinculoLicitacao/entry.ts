import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { upsertLicitacaoUnidade } from '../../shared/licitacaoUnidade.ts';

const camposPermitidos = new Set([
  'favorito', 'oculto', 'status', 'status_leitura', 'notas',
  'valor_proposta', 'lista_favorita_id', 'salva_manualmente',
]);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const licitacaoId = payload.licitacaoId;
    const unidadeId = payload.unidadeId || user.unidade_negocio_id;
    if (!licitacaoId || !unidadeId) {
      return Response.json({ error: 'Licitação e unidade são obrigatórias' }, { status: 400 });
    }
    if (user.role !== 'admin' && unidadeId !== user.unidade_negocio_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const campos = {};
    for (const [chave, valor] of Object.entries(payload.campos || {})) {
      if (camposPermitidos.has(chave)) campos[chave] = valor;
    }
    if (Object.keys(campos).length === 0) {
      return Response.json({ error: 'Nenhum campo válido informado' }, { status: 400 });
    }

    const vinculo = await upsertLicitacaoUnidade(base44, licitacaoId, unidadeId, campos);
    return Response.json({ ok: true, vinculo });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}