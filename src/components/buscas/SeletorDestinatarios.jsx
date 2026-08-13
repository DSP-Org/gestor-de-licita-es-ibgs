import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Loader2, ChevronDown } from "lucide-react";

// `contatos` são registros da agenda Destinatario, carregados uma única vez pelo pai.
// O campo destinatarios_email guarda endereços; buscas antigas podem ter IDs de User,
// que aparecem aqui como selecionados sem contato correspondente até serem trocados.
export default function SeletorDestinatarios({ busca, onUpdated, contatos = [], carregando = false }) {
  const [atualizando, setAtualizando] = useState(false);
  const [selecionados, setSelecionados] = useState(busca.destinatarios_email || []);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    setSelecionados(busca.destinatarios_email || []);
  }, [busca.destinatarios_email]);

  const salvar = async (novosSelecionados) => {
    setAtualizando(true);
    try {
      await base44.entities.BuscaSalva.update(busca.id, {
        destinatarios_email: novosSelecionados,
      });
      onUpdated?.(busca.id, "destinatarios_email", novosSelecionados);
    } finally {
      setAtualizando(false);
    }
  };

  const toggleDestinatario = (email) => {
    const novos = selecionados.includes(email)
      ? selecionados.filter((e) => e !== email)
      : [...selecionados, email];
    setSelecionados(novos);
    salvar(novos);
  };

  const selecionarTodos = () => {
    const todos = contatos.map((c) => c.email).filter(Boolean);
    setSelecionados(todos);
    salvar(todos);
  };

  const limpar = () => {
    setSelecionados([]);
    salvar([]);
  };

  const legados = selecionados.filter((v) => !String(v).includes("@")).length;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" /> Quem recebe esta busca
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs">{selecionados.length} selecionado(s)</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expandido ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expandido && (
        <>
          {contatos.length > 0 && (
            <div className="flex gap-2 text-xs ml-4">
              <button
                type="button"
                onClick={selecionarTodos}
                disabled={atualizando}
                className="text-primary hover:underline disabled:opacity-50"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={limpar}
                disabled={atualizando}
                className="text-muted-foreground hover:underline disabled:opacity-50"
              >
                Limpar
              </button>
            </div>
          )}

          {carregando ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1 ml-4">
              <Loader2 className="w-3 h-3 animate-spin" /> Carregando contatos...
            </p>
          ) : contatos.length === 0 ? (
            <p className="text-xs text-muted-foreground ml-4">
              Nenhum contato na agenda. Cadastre na aba Destinatários — sem ninguém escolhido,
              o e-mail vai para o dono da busca.
            </p>
          ) : (
            <div className="ml-4 max-h-40 overflow-auto border rounded-md p-2 space-y-1">
              {contatos.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-muted rounded px-1"
                >
                  <input
                    type="checkbox"
                    checked={selecionados.includes(c.email)}
                    onChange={() => toggleDestinatario(c.email)}
                    disabled={atualizando}
                    className="w-4 h-4"
                  />
                  <span className="min-w-0 truncate">{c.nome || c.email}</span>
                  {c.nome && (
                    <span className="text-xs text-muted-foreground truncate">· {c.email}</span>
                  )}
                </label>
              ))}
            </div>
          )}

          {legados > 0 && (
            <p className="text-[11px] text-amber-600 ml-4">
              {legados} destinatário(s) desta busca foram configurados no formato antigo e não
              aparecem na lista. Continuam recebendo normalmente; escolha os contatos acima para
              substituí-los.
            </p>
          )}
        </>
      )}
    </div>
  );
}
