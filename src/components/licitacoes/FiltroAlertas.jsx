import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Bell } from "lucide-react";

const selectClass =
  "flex-1 sm:flex-none min-w-0 px-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring";

export default function FiltroAlertas({ alertas, filtroOrigem, setFiltroOrigem }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return alertas;
    return alertas.filter(([nome]) => nome.toLowerCase().includes(q));
  }, [alertas, busca]);

  const selecionado = filtroOrigem || "";

  return (
    <div className="relative flex-1 sm:flex-none min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setBusca("");
          setAberto((v) => !v);
        }}
        className={`${selectClass} text-left flex items-center justify-between gap-2 cursor-pointer`}
      >
        <span className={`flex items-center gap-1.5 ${selecionado ? "" : "text-muted-foreground"}`}>
          <Bell className="w-3.5 h-3.5 shrink-0" />
          {selecionado || "Todos os alertas"}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div className="absolute z-50 mt-1 w-full min-w-56 bg-popover border rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b sticky top-0 bg-popover">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar alerta..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            <button
              type="button"
              onClick={() => {
                setFiltroOrigem(null);
                setAberto(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${!filtroOrigem ? "bg-primary/10 font-medium" : ""}`}
            >
              Todos os alertas
            </button>
            {filtrados.map(([nome, count]) => (
              <button
                key={nome}
                type="button"
                onClick={() => {
                  setFiltroOrigem(filtroOrigem === nome ? null : nome);
                  setAberto(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2 ${filtroOrigem === nome ? "bg-primary/10 font-medium" : ""}`}
              >
                <span className="truncate">{nome}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted shrink-0">{count}</span>
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum alerta</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}