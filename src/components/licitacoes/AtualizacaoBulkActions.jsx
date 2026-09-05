import { Send, Star, Trash2, Clock, Undo2 } from "lucide-react";

export default function AtualizacaoBulkActions({
  quantidade,
  onSend,
  onSave,
  onDelete,
  onTriagem,
  onRestaurar,
  modo = "novas",
}) {
  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border bg-card/95 p-2 shadow-xl backdrop-blur sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none sm:gap-2">
      {onSend && (
        <button
          onClick={onSend}
          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Send className="h-4 w-4" /> <span className="hidden sm:inline">Enviar</span> ({quantidade})
        </button>
      )}

      {modo === "descartadas" && onRestaurar && (
        <button
          onClick={onRestaurar}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 sm:px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <Undo2 className="h-4 w-4" /> <span className="hidden sm:inline">Restaurar</span> ({quantidade})
        </button>
      )}

      {modo !== "descartadas" && (
        <>
          {onTriagem && (
            <button
              onClick={onTriagem}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 sm:px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Clock className="h-4 w-4" /> <span className="hidden sm:inline">Em Triagem</span> ({quantidade})
            </button>
          )}

          {onSave && (
            <button
              onClick={onSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 sm:px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors shadow-xs"
            >
              <Star className="h-4 w-4 fill-white" /> <span className="hidden sm:inline">Favoritar</span> ({quantidade})
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-2.5 sm:px-3 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Descartar</span> ({quantidade})
            </button>
          )}
        </>
      )}
    </div>
  );
}