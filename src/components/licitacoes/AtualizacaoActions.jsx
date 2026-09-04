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
    <div className="flex flex-wrap items-center gap-2">
      {onSend && (
        <button
          onClick={onSend}
          title="Enviar / Compartilhar por e-mail"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
        >
          <Send className="h-3.5 w-3.5" /> <span>Compartilhar</span>
        </button>
      )}

      {modo === "descartadas" && onRestaurar && (
        <button
          onClick={onRestaurar}
          title="Restaurar para Novas"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
        >
          <Undo2 className="h-3.5 w-3.5" /> <span>Restaurar</span>
        </button>
      )}

      {modo !== "descartadas" && (
        <>
          {onTriagem && (
            <button
              onClick={onTriagem}
              title="Mover para Em Triagem / Análise"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              <Clock className="h-3.5 w-3.5" /> <span>Em Triagem</span>
            </button>
          )}

          {onSave && (
            <button
              onClick={onSave}
              title="Aprovar e enviar para Minhas Licitações (Favoritas)"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-xs transition-colors"
            >
              <Star className="h-3.5 w-3.5 fill-white text-white" /> <span>Minhas Licitações</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              title="Descartar licitação"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Descartar</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}