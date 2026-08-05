import { secrets } from "base44:runtime";

/**
 * Envia e-mail HTML para destinatários externos (não cadastrados no sistema)
 * usando a API do Resend.
 */
export async function enviarEmailExterno(emails, subject, htmlBody) {
  const apiKey = secrets.get("RESEND_API_KEY");
  if (!apiKey || !emails || emails.length === 0) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Licitalerta360 <onboarding@resend.dev>",
      to: emails,
      subject,
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao enviar e-mail externo: ${text}`);
  }

  return await res.json();
}