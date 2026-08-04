import { Send, Save, Trash2 } from "lucide-react";

export default function AtualizacaoBulkActions({ quantidade, onSend, onSave, onDelete }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button onClick={onSend} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
        <Send className="h-4 w-4" /> Enviar ({quantidade})
      </button>
      <button onClick={onSave} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
        <Save className="h-4 w-4" /> Salvar ({quantidade})
      </button>
      <button onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90">
        <Trash2 className="h-4 w-4" /> Excluir ({quantidade})
      </button>
    </div>
  );
}