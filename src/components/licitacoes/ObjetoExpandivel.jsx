import { useState } from "react";

export default function ObjetoExpandivel({
  texto,
  className = "",
  textClassName = "text-xs text-muted-foreground",
  linhas = "line-clamp-2",
}) {
  const [expandido, setExpandido] = useState(false);
  if (!texto) return null;
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <p className={`${textClassName} ${expandido ? "" : linhas} ${className}`}>{texto}</p>
      {texto.length > 90 && (
        <button
          onClick={() => setExpandido((v) => !v)}
          className="text-[11px] text-primary font-medium mt-0.5 hover:underline"
        >
          {expandido ? "Ver menos" : "Ver objeto completo"}
        </button>
      )}
    </div>
  );
}