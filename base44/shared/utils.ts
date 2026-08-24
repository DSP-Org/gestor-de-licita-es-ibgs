export function dataSP(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function hojeSP(): string {
  return dataSP(new Date());
}

export function escapaHTML(s: unknown): string {
  const str = String(s ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function criaEmailTemplate(
  titulo: string,
  cards: string,
  novasCount: number,
  linkCompartilhamento: string
): string {
  const botaoCompartilhar = linkCompartilhamento
    ? `<tr><td style="padding:8px 24px 20px;">
        <a href="${escapaHTML(linkCompartilhamento)}" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Ver todas as licitações no painel →</a>
      </td></tr>`
    : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#111827;padding:24px;">
            <h1 style="margin:0;color:#ffffff;font-size:18px;">🔔 Novas licitações encontradas</h1>
            <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Busca: ${escapaHTML(titulo)}</p>
          </td></tr>
          <tr><td style="padding:20px 24px 8px;">
            <p style="margin:0;font-size:14px;color:#374151;">Foram encontradas <b>${novasCount} nova(s) licitação(oes)</b> para a sua busca:</p>
          </td></tr>
          ${cards}
          ${novasCount > 10 ? `<tr><td style="padding:0 24px 8px;font-size:13px;color:#6b7280;">... e mais ${novasCount - 10} licitação(oes). Acesse o painel para visualizar todas.</td></tr>` : ""}
          ${botaoCompartilhar}
          <tr><td style="padding:16px 24px 24px;">
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">Enviado pelo Licitalerta360</p>
            <p style="margin:0;font-size:11px;color:#9ca3af;">Desenvolvido por Data5 Tecnologia — Todos os direitos reservados</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}
