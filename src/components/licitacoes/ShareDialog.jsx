import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Share2, Loader2, Copy, Check, MessageCircle, Send, Mail, Link2 } from "lucide-react";

export default function ShareDialog({ licitacoes, origem, onClose }) {
  const [gerando, setGerando] = useState(false);
  const [link, setLink] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");

  const gerarLink = async () => {
    setGerando(true);
    setErro("");
    try {
      const codigo = crypto.randomUUID();
      const base = window.location.origin;
      const novoLink = `${base}/compartilhar/${codigo}`;

      await base44.entities.ResultadoCompartilhado.create({
        codigo,
        busca_nome: origem || "compartilhado",
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
          link_externo: l.link_externo,
        })),
      });

      setLink(novoLink);

      // Tenta usar o compartilhamento nativo (mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Licitações — ${origem || "compartilhado"}`,
            text: `${licitacoes.length} licitação(ões) compartilhada(s) com você:`,
            url: novoLink,
          });
        } catch {
          // Usuário cancelou o share nativo — mantém o link visível
        }
      }
    } catch (e) {
      setErro(e.message || "Erro ao gerar link de compartilhamento.");
    } finally {
      setGerando(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  const texto = `${licitacoes.length} licitação(ões) compartilhada(s) com você via Licitalerta360: ${link}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between">
          <h2 className="font-heading font-semibold flex items-center gap-2"><Share2 className="w-4 h-4" /> Compartilhar</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
            {licitacoes.length} licitação(ões) serão compartilhadas via um link público. Quem receber poderá visualizar e importar para sua conta.
          </div>

          {!link && !erro && (
            <button
              onClick={gerarLink}
              disabled={gerando}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {gerando ? "Gerando link..." : "Gerar link e compartilhar"}
            </button>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          {link && (
            <>
              {/* Compartilhamento nativo (mobile) */}
              {navigator.share && (
                <button
                  onClick={() => navigator.share({ title: `Licitações — ${origem}`, text: texto, url: link }).catch(() => {})}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90"
                >
                  <Share2 className="w-4 h-4" /> Compartilhar agora
                </button>
              )}

              {/* Botões individuais */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-[#25D366] rounded-md hover:opacity-90"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`${licitacoes.length} licitação(ões) compartilhada(s)`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-[#0088cc] rounded-md hover:opacity-90"
                >
                  <Send className="w-4 h-4" /> Telegram
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(`Licitações — ${origem || "compartilhado"}`)}&body=${encodeURIComponent(texto)}`}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:opacity-90"
                >
                  <Mail className="w-4 h-4" /> E-mail
                </a>
                <button
                  onClick={copiar}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium border rounded-md hover:bg-muted"
                >
                  {copiado ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copiado ? "Copiado!" : "Copiar link"}
                </button>
              </div>

              {/* Link visível para copiar manualmente */}
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  value={link}
                  readOnly
                  className="flex-1 min-w-0 text-xs bg-transparent outline-none"
                />
                <button onClick={copiar} className="text-xs text-primary font-medium shrink-0">
                  {copiado ? "✓" : "Copiar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}