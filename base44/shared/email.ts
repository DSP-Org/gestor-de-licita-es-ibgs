import { secrets } from "base44:runtime";

/**
 * Envia e-mail HTML para destinatários externos (não cadastrados no sistema)
 * usando a API do Resend.
 *
 * @param {string[]} emails - Lista de endereços de e-mail dos destinatários.
 * @param {string} subject - Assunto do e-mail.
 * @param {string} htmlBody - Corpo do e-mail em HTML.
 * @param {Array<{filename: string, content: string, contentType?: string}>} [attachments=[]]
 *   Lista de anexos. Cada anexo deve conter:
 *   - `filename`: Nome do arquivo (ex: "relatorio-licitacoes.pdf").
 *   - `content`: Conteúdo do arquivo em **base64** (sem o prefixo data:).
 *   - `contentType` (opcional): MIME type do arquivo (ex: "application/pdf").
 *     Se omitido, o Resend infere pelo nome do arquivo.
 *
 *   Para gerar o base64 de um PDF criado com jsPDF no frontend:
 *   ```js
 *   const blob = doc.output('blob');
 *   const reader = new FileReader();
 *   reader.onload = () => {
 *     const base64 = reader.result.split(',')[1]; // remove prefixo data:...
 *     // enviar como attachment
 *   };
 *   reader.readAsDataURL(blob);
 *   ```
 *
 * @returns {Promise<object>} Resposta da API do Resend (contém o `id` do e-mail enviado).
 * @throws {Error} Se a API retornar erro (status não-2xx).
 *
 * @example
 * // Envio simples (sem anexo) — compatível com chamadas antigas:
 * await enviarEmailExterno(['user@example.com'], 'Olá', '<p>Mundo</p>');
 *
 * @example
 * // Envio com anexo PDF:
 * await enviarEmailExterno(
 *   ['user@example.com'],
 *   'Relatório de licitações',
 *   '<p>Segue o relatório em anexo.</p>',
 *   [{ filename: 'relatorio.pdf', content: base64Pdf, contentType: 'application/pdf' }]
 * );
 */
export async function enviarEmailExterno(emails, subject, htmlBody, attachments = []) {
  const apiKey = secrets.get("RESEND_API_KEY");
  if (!apiKey || !emails || emails.length === 0) return;

  const payload = {
    from: "Licitalerta360 <onboarding@resend.dev>",
    to: emails,
    subject,
    html: htmlBody,
  };

  // Só inclui attachments se houver pelo menos um — mantém compatibilidade
  // retroativa com chamadas existentes que não passam o 4º argumento.
  if (Array.isArray(attachments) && attachments.length > 0) {
    payload.attachments = attachments.map((att) => {
      const item = {
        filename: att.filename,
        content: att.content, // base64 sem prefixo data:
      };
      if (att.contentType) {
        item.content_type = att.contentType;
      }
      return item;
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao enviar e-mail externo: ${text}`);
  }

  return await res.json();
}