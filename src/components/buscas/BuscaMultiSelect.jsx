import { useState, useRef, useEffect } from "react";

export default function BuscaMultiSelect({ options: buscas, value: selecionadas, onChange, disabled }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [aberto]);

  const selecionarTodas = () => {
    // Quando seleciona todas, passa todos os IDs para sincronizar todas
    onChange(buscas.map((busca) => busca.id));
    setAberto(false);
  };

  const selecionarUnica = (id) => {
    // Permite apenas uma busca por vez
    onChange([id]);
    setAberto(false);
  };

  const todasSelecionadas = buscas.length > 0 && selecionadas.length === buscas.length;
  const buscaUnica = !todasSelecionadas && selecionadas.length === 1 
    ? buscas.find((b) => b.id === selecionadas[0]) 
    : null;

  const resumo = todasSelecionadas
    ? "Todas as buscas ativas"
    : buscaUnica
    ? buscaUnica.nome
    : selecionadas.length === 0
    ? "Nenhuma busca selecionada"
    : `${selecionadas.length} busca(s) selecionada(s)`;

  return (
    <div ref={ref} className={`relative w-full sm:w-auto sm:min-w-[14rem] text-sm ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2 font-medium text-left truncate flex items-center justify-between gap-2 shadow-xs hover:border-primary/50 transition-colors"
      >
        <span className="truncate">{resumo}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">▼</span>
      </button>
      {aberto && (
        <div className="absolute right-0 z-30 mt-2 w-full min-w-[16rem] max-w-[22rem] rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl">
          <p className="px-2 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtrar / Sincronizar Busca</p>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${todasSelecionadas ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted"}`}>
              <input
                type="radio"
                name="busca_selecionada"
                checked={todasSelecionadas}
                onChange={selecionarTodas}
                className="accent-primary"
              />
              <span>Todas as buscas ativas</span>
            </label>
            {buscas.map((busca) => {
              const selecionada = !todasSelecionadas && selecionadas.includes(busca.id);
              return (
                <label
                  key={busca.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${selecionada ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted"}`}
                >
                  <input
                    type="radio"
                    name="busca_selecionada"
                    checked={selecionada}
                    onChange={() => selecionarUnica(busca.id)}
                    className="accent-primary"
                  />
                  <span className="truncate">{busca.nome}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}