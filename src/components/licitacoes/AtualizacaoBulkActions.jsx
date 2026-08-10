import { Send, Star, Trash2 } from "lucide-react";

export default function AtualizacaoBulkActions({ quantidade, onSend, onSave, onDelete }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
      <button onClick={onSend} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-2 text-sm font-medium hover:bg-muted">
        <Send className="h-4 w-4" /> <span className="hidden sm:inline">Enviar</span> ({quantidade})
      </button>
      <button onClick={onSave} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 sm:px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
        <Star className="h-4 w-4" /> <span className="hidden sm:inline">Favoritar</span> ({quantidade})
      </button>
      <button onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-2.5 sm:px-3 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90">
        <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Excluir</span> ({quantidade})
      </button>
    </div>
  );
}