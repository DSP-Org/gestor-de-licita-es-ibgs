import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

// Multi-seleção genérica por lista de opções (string). Persiste como string separada por vírgula.
export default function OpcoesMultiSelect({ value, onChange, options = [], placeholder = "Selecione uma ou mais opções", disabled = false }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const selecionadas = (value || "").split(",").map((s) => s.trim()).filter(Boolean);

  useEffect(() => {
    const fechar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const toggle = (opcao) => {
    const nova = selecionadas.includes(opcao)
      ? selecionadas.filter((o) => o !== opcao)
      : [...selecionadas, opcao];
    onChange(nova.join(","));
  };

  const label = selecionadas.length === 0
    ? placeholder
    : selecionadas.length <= 2
    ? selecionadas.join(", ")
    : `${selecionadas.length} selecionadas`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAberto((v) => !v)}
        className="w-full px-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring flex items-center justify-between disabled:opacity-50"
      >
        <span className={`truncate ${selecionadas.length ? "" : "text-muted-foreground"}`}>{label}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {aberto && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-card border rounded-md shadow-lg p-2 space-y-0.5">
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1.5 py-1">Nenhuma opção disponível.</p>
          ) : (
            options.map((opcao) => (
              <label
                key={opcao}
                className="flex items-center gap-1.5 text-sm py-1 px-1.5 rounded cursor-pointer hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selecionadas.includes(opcao)}
                  onChange={() => toggle(opcao)}
                  className="w-3.5 h-3.5"
                />
                {opcao}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}