import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { enviarEmailExterno } from "../../shared/email.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { emails, subject, html, attachments } = await req.json().catch(() => ({}));
    const destinatarios = (Array.isArray(emails) ? emails : []).filter(Boolean);
    if (destinatarios.length === 0) {
      return Response.json({ error: 'Nenhum destinatário informado.' }, { status: 400 });
    }
    if (!subject || !html) {
      return Response.json({ error: 'Assunto e conteúdo são obrigatórios.' }, { status: 400 });
    }

    await enviarEmailExterno(destinatarios, subject, html, attachments);
    return Response.json({ ok: true, enviados: destinatarios.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}