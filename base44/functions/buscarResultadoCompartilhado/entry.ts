import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const codigo = body.codigo;
    if (!codigo) {
      return Response.json({ error: "Código não informado" }, { status: 400 });
    }

    const resultados = await base44.asServiceRole.entities.ResultadoCompartilhado.filter(
      { codigo },
      "-created_date",
      1
    );

    if (!resultados || resultados.length === 0) {
      return Response.json({ error: "Resultado não encontrado" }, { status: 404 });
    }

    return Response.json(resultados[0]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}