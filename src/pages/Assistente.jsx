import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Loader2, Sparkles } from "lucide-react";
import MessageBubble from "@/components/assistente/MessageBubble";

const AGENT_NAME = "assistente_licitalerta";

export default function Assistente() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    let unsubscribe;
    (async () => {
      try {
        const conversas = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        let conv;
        if (conversas && conversas.length > 0) {
          conv = await base44.agents.getConversation(conversas[0].id);
        } else {
          conv = await base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: "Assistente", description: "Conversa com o assistente Licitalerta360" },
          });
        }
        setConversation(conv);
        setMessages(conv.messages || []);
        unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages);
        });
      } catch (e) {
        setErro(e.message || "Erro ao carregar o assistente.");
      } finally {
        setLoading(false);
      }
    })();
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || !conversation || enviando) return;
    setInput("");
    setEnviando(true);
    setErro("");
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: texto });
    } catch (e) {
      setErro(e.message || "Erro ao enviar mensagem.");
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen max-w-3xl mx-auto w-full">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold leading-tight">Assistente Licitalerta360</h1>
            <p className="text-xs text-muted-foreground">Tire dúvidas e consulte suas licitações</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando assistente...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-16">
            Pergunte algo, por exemplo: "Quais licitações abertas em SP hoje?" ou "Quantas licitações eu tenho salvas?"
          </div>
        ) : (
          messages.map((m, i) => <MessageBubble key={i} message={m} />)
        )}
        {erro && <p className="text-sm text-red-600 text-center">{erro}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="border-t px-4 sm:px-6 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none px-3 py-2.5 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring max-h-32"
          />
          <button
            onClick={enviar}
            disabled={loading || enviando || !input.trim()}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}