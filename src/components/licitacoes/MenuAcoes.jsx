import { useEffect, useRef, useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";

export default function MenuAcoes({ children, onDelete }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (!ref.current?.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  if (!children && !onDelete) return null;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        title="Ações"
        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {aberto && (
        <div
          className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg z-50 min-w-44 p-1.5 flex flex-col items-stretch gap-1"
          onClick={() => setAberto(false)}
        >
          {children}
          {onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground rounded-md hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" /> Descartar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
