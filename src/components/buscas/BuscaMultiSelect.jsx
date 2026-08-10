import { useState, useRef, useEffect } from "react";

export default function BuscaMultiSelect({ options: buscas, value: selecionadas, onChange, disabled }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  const todasSelecionadas = buscas.length > 0 && selecionadas.length === buscas.length;

  useEffect(() => {
    if (!aberto) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [aberto]);

  const alternarTodas = () => {
    onChange(todasSelecionadas ? [] : buscas.map((busca) => busca.id));
  };

  const alternarBusca = (id) => {
    onChange(selecionadas.includes(id)
      ? selecionadas.filter((item) => item !== id)
      : [...selecionadas, id]);
  };

  const resumo = todasSelecionadas
    ? "Todas as sincronizações"
    : `${selecionadas.length} sincronização(ões)`;

  return (
    <div ref={ref} className={`relative w-full sm:w-auto sm:min-w-[13rem] text-sm ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full cursor-pointer rounded-lg border bg-background px-3 py-2 font-medium text-left"
      >
        {resumo}
      </button>
      {aberto && (
        <div className="absolute right-0 z-30 mt-2 w-full min-w-[16rem] max-w-[20rem] rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg">
          <p className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">Escolha o que sincronizar</p>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted">
              <input type="checkbox" checked={todasSelecionadas} onChange={alternarTodas} />
              <span className="font-medium">Todas as buscas ativas</span>
            </label>
            {buscas.map((busca) => (
              <label key={busca.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted">
                <input
                  type="checkbox"
                  checked={selecionadas.includes(busca.id)}
                  onChange={() => alternarBusca(busca.id)}
                />
                <span>{busca.nome}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}