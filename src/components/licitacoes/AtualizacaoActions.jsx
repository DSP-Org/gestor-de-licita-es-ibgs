import { Send, Star, Trash2 } from "lucide-react";

export default function AtualizacaoActions({ onSend, onSave, onDelete }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={onSend} title="Enviar" className="inline-flex items-center text-muted-foreground hover:text-primary sm:gap-1.5 sm:text-xs">
        <Send className="h-4 w-4" /> <span className="hidden sm:inline">Enviar</span>
      </button>
      <button onClick={onSave} title="Favoritar" className="inline-flex items-center text-muted-foreground hover:text-primary sm:gap-1.5 sm:text-xs">
        <Star className="h-4 w-4" /> <span className="hidden sm:inline">Favoritar</span>
      </button>
      <button onClick={onDelete} title="Excluir" className="inline-flex items-center text-muted-foreground hover:text-destructive sm:gap-1.5 sm:text-xs">
        <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Excluir</span>
      </button>
    </div>
  );
}