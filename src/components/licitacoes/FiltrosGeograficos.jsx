import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";

const selectClass =
  "flex-1 sm:flex-none min-w-0 px-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring";

function FiltroBuscavel({ value, onChange, placeholder, options, disabled }) {
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
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, busca]);

  const selecionado = value !== "todos" ? value : "";

  return (
    <div className="relative flex-1 sm:flex-none min-w-0" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setBusca("");
          setAberto((v) => !v);
        }}
        className={`${selectClass} min-h-11 text-left flex items-center justify-between gap-2 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={selecionado ? "" : "text-muted-foreground"}>
          {selecionado || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div className="fixed inset-x-0 bottom-0 z-50 w-full bg-popover border-t rounded-t-2xl shadow-2xl max-h-[75vh] overflow-hidden flex flex-col sm:absolute sm:inset-auto sm:mt-1 sm:w-full sm:min-w-48 sm:rounded-lg sm:border sm:shadow-lg sm:max-h-64">
          <div className="p-2 border-b sticky top-0 bg-popover">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            <button
              type="button"
              onClick={() => {
                onChange("todos");
                setAberto(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${value === "todos" ? "bg-primary/10 font-medium" : ""}`}
            >
              {placeholder}
            </button>
            {filtrados.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setAberto(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${value === opt ? "bg-primary/10 font-medium" : ""}`}
              >
                {opt}
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum resultado</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FiltrosGeograficos({
  ufs,
  municipios,
  modalidades,
  filtroUF,
  setFiltroUF,
  filtroMunicipio,
  setFiltroMunicipio,
  filtroModalidade,
  setFiltroModalidade,
}) {
  return (
    <>
      <FiltroBuscavel
        value={filtroUF}
        onChange={(v) => {
          setFiltroUF(v);
          setFiltroMunicipio("todos");
        }}
        placeholder="Todos os estados"
        options={ufs}
      />

      <FiltroBuscavel
        value={filtroMunicipio}
        onChange={setFiltroMunicipio}
        placeholder="Todas as cidades"
        options={municipios}
      />

      <FiltroBuscavel
        value={filtroModalidade}
        onChange={setFiltroModalidade}
        placeholder="Todas as modalidades"
        options={modalidades}
      />
    </>
  );
}