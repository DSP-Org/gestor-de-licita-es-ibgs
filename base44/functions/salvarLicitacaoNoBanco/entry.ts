import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const camposGlobais = [
  'id_licitacao', 'titulo', 'objeto', 'uf', 'municipio', 'municipio_ibge',
  'orgao', 'abertura_datetime', 'abertura', 'tipo', 'id_tipo', 'valor',
  'link', 'link_externo', 'busca_origem', 'data_sincronizacao', 'data_publicacao',
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const entrada = await req.json().catch(() => null);
    if (!entrada?.id_licitacao) {
      return Response.json({ error: 'Licitação inválida' }, { status: 400 });
    }

    const dados = {};
    for (const campo of camposGlobais) {
      const valor = campo === 'municipio_ibge'
        ? (entrada.municipio_ibge || entrada.municipio_IBGE)
        : campo === 'link_externo'
          ? (entrada.link_externo || entrada.linkExterno)
          : entrada[campo];
      if (valor !== undefined) dados[campo] = valor;
    }

    const existentes = await base44.asServiceRole.entities.Licitacao.filter({ id_licitacao: entrada.id_licitacao });
    const licitacao = existentes[0]
      ? await base44.asServiceRole.entities.Licitacao.update(existentes[0].id, dados)
      : await base44.asServiceRole.entities.Licitacao.create(dados);

    return Response.json({ ok: true, licitacao });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}