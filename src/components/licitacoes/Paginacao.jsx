import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Paginacao({ pagina, totalPaginas, onChange }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        onClick={() => onChange((p) => Math.max(1, p - 1))}
        disabled={pagina === 1}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" /> Anterior
      </button>
      <span className="text-sm text-muted-foreground">
        Página <span className="font-medium text-foreground">{pagina}</span> de {totalPaginas}
      </span>
      <button
        onClick={() => onChange((p) => Math.min(totalPaginas, p + 1))}
        disabled={pagina === totalPaginas}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Próxima <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}