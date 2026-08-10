import { secrets } from "base44:runtime";

export async function enviarTelegram(chatIds: string, texto: string) {
  const token = secrets.get("TELEGRAM_BOT_TOKEN");
  if (!token) return [{ erro: "Token do Telegram não configurado" }];

  const ids = String(chatIds || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const resultados = [];
  for (const chatId of ids) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: texto,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      const data = await resp.json();
      resultados.push({ chatId, ok: !!data.ok, erro: data.ok ? null : data.description });
    } catch (e) {
      resultados.push({ chatId, ok: false, erro: e.message });
    }
  }
  return resultados;
}