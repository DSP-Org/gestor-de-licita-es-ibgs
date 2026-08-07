import { Send, Star, Trash2 } from "lucide-react";

export default function AtualizacaoActions({ onSend, onSave, onDelete }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={onSend} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
        <Send className="h-3.5 w-3.5" /> Enviar
      </button>
      <button onClick={onSave} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
        <Star className="h-3.5 w-3.5" /> Favoritar
      </button>
      <button onClick={onDelete} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" /> Excluir
      </button>
    </div>
  );
}