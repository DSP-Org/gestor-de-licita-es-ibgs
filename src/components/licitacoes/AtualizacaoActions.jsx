import { Send, Star, Trash2, Clock, Undo2 } from "lucide-react";

export default function AtualizacaoActions({
  onSend,
  onSave,
  onDelete,
  onTriagem,
  onRestaurar,
  modo = "novas",
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 w-full pt-1">
      <div className="flex items-center gap-2">
        {onSend && (
          <button
            onClick={onSend}
            title="Enviar / Compartilhar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-transparent hover:border-border/60"
          >
            <Send className="h-3.5 w-3.5" /> <span>Enviar</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {modo === "descartadas" && onRestaurar && (
          <button
            onClick={onRestaurar}
            title="Restaurar para Novas"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <Undo2 className="h-3.5 w-3.5" /> <span>Restaurar</span>
          </button>
        )}

        {modo !== "descartadas" && (
          <>
            {onTriagem && (
              <button
                onClick={onTriagem}
                title="Mover para Em Triagem"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                <Clock className="h-3.5 w-3.5" /> <span>Em Triagem</span>
              </button>
            )}

            {onSave && (
              <button
                onClick={onSave}
                title="Favoritar para Minhas Licitações"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> <span>Aprovar / Minhas Licitações</span>
              </button>
            )}

            {onDelete && (
              <button
                onClick={onDelete}
                title="Descartar licitação"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Descartar</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}