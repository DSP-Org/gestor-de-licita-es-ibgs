import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { consultarAlertaLicitacao } from "../../shared/alertaApi.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const data = await consultarAlertaLicitacao(body);
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}