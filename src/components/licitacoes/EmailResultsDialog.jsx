import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Mail, Loader2, Send } from "lucide-react";
import { formatValor } from "./LicitacaoCard";

export default function EmailResultsDialog({ licitacoes, origem, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [destinatario, setDestinatario] = useState("");
  const [assunto, setAssunto] = useState(`Resultados de licitações — ${origem || "busca"}`);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    base44.entities.User.list("-created_date", 100)
      .then((lista) => {
        setUsuarios(lista);
        if (lista.length > 0) setDestinatario(lista[0].email);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar usuários."))
      .finally(() => setLoading(false));
  }, []);

  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const montarCorpo = (linkCompartilhamento) => {
    const base = window.location.origin;
    const cards = licitacoes.map((l, i) => {
      const valor = formatValor(l.valor);
      const local = [l.uf, l.municipio].filter(Boolean).join(" - ");
      return `<tr><td style="padding:0 24px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
          <tr><td style="padding:16px;">
            <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">${i + 1}. ${esc(l.titulo)}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#4b5563;">Órgão: ${esc(l.orgao) || "—"} · ${esc(local) || "—"} · ${esc(l.tipo) || "—"}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#4b5563;">Abertura: ${esc(l.abertura) || "—"} · Valor: ${valor}</p>
          </td></tr>
        </table>
      </td></tr>`;
    }).join("");
    const botaoCompartilhar = linkCompartilhamento
      ? `<tr><td style="padding:8px 24px 20px;">
          <a href="${esc(linkCompartilhamento)}" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Ver todas as licitações no painel →</a>
        </td></tr>`
      : "";
    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#111827;padding:24px;">
          <h1 style="margin:0;color:#ffffff;font-size:18px;">🔔 Resultados de licitações</h1>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Busca: ${esc(origem) || "—"}</p>
        </td></tr>
        <tr><td style="padding:20px 24px 8px;">
          <p style="margin:0;font-size:14px;color:#374151;">Foram encontradas <b>${licitacoes.length} licitação(ões)</b> para a sua busca:</p>
        </td></tr>
        ${cards}
        <tr><td style="padding:16px 24px 24px;">
          <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">Enviado pelo Gestor de Licitações IBGS</p>
          <p style="margin:0;font-size:11px;color:#9ca3af;">Desenvolvido por Data5 Tecnologia — Todos os direitos reservados</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  };

  const enviar = async () => {
    if (!destinatario) return;
    setEnviando(true);
    setMsg("");
    setErro("");
    try {
      // Cria um resultado compartilhado com código único
      const codigo = crypto.randomUUID();
      const base = window.location.origin;
      const linkCompartilhamento = `${base}/compartilhar/${codigo}`;

      await base44.entities.ResultadoCompartilhado.create({
        codigo,
        busca_nome: origem || "busca manual",
        licitacoes: licitacoes.map((l) => ({
          id_licitacao: l.id_licitacao,
          titulo: l.titulo,
          objeto: l.objeto,
          orgao: l.orgao,
          uf: l.uf,
          municipio: l.municipio,
          abertura: l.abertura,
          tipo: l.tipo,
          valor: l.valor,
          link: l.link,
          link_externo: l.link_externo,
        })),
      });

      await base44.integrations.Core.SendEmail({
        to: destinatario,
        subject: assunto,
        body: montarCorpo(linkCompartilhamento),
      });
      setMsg(`E-mail enviado para ${destinatario}.`);
    } catch (e) {
      setErro(e.message || "Erro ao enviar e-mail. Apenas usuários cadastrados no app podem receber.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between">
          <h2 className="font-heading font-semibold flex items-center gap-2"><Mail className="w-4 h-4" /> Enviar resultados por e-mail</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
            {licitacoes.length} licitação(ões) serão enviadas. Só é possível enviar para usuários cadastrados no app.
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Destinatário</label>
            {loading ? (
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Carregando usuários...</div>
            ) : usuarios.length === 0 ? (
              <p className="mt-1 text-sm text-red-600">Nenhum usuário cadastrado disponível.</p>
            ) : (
              <select
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.email}>{u.email}{u.role === "admin" ? " (admin)" : ""}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Assunto</label>
            <input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Prévia do conteúdo</label>
            <div
              className="mt-1 w-full border rounded-md bg-white max-h-40 overflow-auto"
              dangerouslySetInnerHTML={{ __html: montarCorpo(`${window.location.origin}/compartilhar/CODIGO`) }}
            />
          </div>

          {msg && <p className="text-sm text-green-600">{msg}</p>}
          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md hover:bg-muted">Fechar</button>
            <button
              onClick={enviar}
              disabled={enviando || !destinatario}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}