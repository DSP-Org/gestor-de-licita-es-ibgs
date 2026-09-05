import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function ObjetoExpandivel({
  texto,
  className = "",
  textClassName = "text-xs text-muted-foreground",
  linhas = "line-clamp-2",
}) {
  const [expandido, setExpandido] = useState(false);
  if (!texto) return null;
  const podeExpandir = texto.length > 90;
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <p className={`${textClassName} ${expandido ? "" : linhas} ${className}`}>{texto}</p>
      {podeExpandir && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="inline-flex min-h-8 items-center gap-1 text-xs text-primary font-semibold mt-1 active:opacity-70"
          aria-expanded={expandido}
        >
          {expandido ? "Ver menos" : "Ver mais"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandido ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}