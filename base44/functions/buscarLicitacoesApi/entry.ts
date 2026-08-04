import { consultarAlertaLicitacao } from "../../shared/alertaApi.ts";

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = await consultarAlertaLicitacao(body);
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}