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

  const montarCorpo = () => {
    const linhas = licitacoes.map((l, i) => {
      const valor = formatValor(l.valor);
      const local = [l.uf, l.municipio].filter(Boolean).join(" - ");
      return `${i + 1}. ${l.titulo}\n   Órgão: ${l.orgao || "—"} | ${local || "—"} | ${l.tipo || "—"}\n   Abertura: ${l.abertura || "—"} | Valor: ${valor}\n   Link: ${l.link || l.link_externo || "—"}`;
    });
    return `Foram encontradas ${licitacoes.length} licitação(ões) em "${origem}".

${linhas.join("\n\n")}

— Enviado pelo Gestor de Licitações IBGS`;
  };

  const enviar = async () => {
    if (!destinatario) return;
    setEnviando(true);
    setMsg("");
    setErro("");
    try {
      await base44.integrations.Core.SendEmail({
        to: destinatario,
        subject: assunto,
        body: montarCorpo(),
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
            <pre className="mt-1 w-full px-3 py-2 text-xs border rounded-md bg-muted/30 max-h-40 overflow-auto whitespace-pre-wrap font-mono">
{montarCorpo().slice(0, 600)}{licitacoes.length > 3 ? "\n..." : ""}
            </pre>
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