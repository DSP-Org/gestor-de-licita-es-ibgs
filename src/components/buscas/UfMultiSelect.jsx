import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { UFS } from "@/shared/alertaApi";

export default function UfMultiSelect({ value, onChange }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const selecionadas = (value || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

  useEffect(() => {
    const fechar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const toggle = (uf) => {
    const nova = selecionadas.includes(uf)
      ? selecionadas.filter((u) => u !== uf)
      : [...selecionadas, uf];
    onChange(nova.join(","));
  };

  const label = selecionadas.length === 0
    ? "Selecione um ou mais estados"
    : selecionadas.length <= 3
    ? selecionadas.join(", ")
    : `${selecionadas.length} estados selecionados`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring flex items-center justify-between"
      >
        <span className={selecionadas.length ? "" : "text-muted-foreground"}>{label}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {aberto && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-card border rounded-md shadow-lg p-2 grid grid-cols-4 gap-1">
          {UFS.map((uf) => (
            <label
              key={uf}
              className="flex items-center gap-1.5 text-sm py-1 px-1.5 rounded cursor-pointer hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selecionadas.includes(uf)}
                onChange={() => toggle(uf)}
                className="w-3.5 h-3.5"
              />
              {uf}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}