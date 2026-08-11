import { useState } from "react";
import { MoreVertical, Send, Star, Trash2 } from "lucide-react";

export default function MenuAcoes({ onSend, onSave, onDelete }) {
  const [aberto, setAberto] = useState(false);

  const handleAction = (callback) => {
    callback?.();
    setAberto(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setAberto(!aberto)}
        title="Ações"
        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAberto(false)}
          />
          <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg z-50 min-w-44">
            {onSend && (
              <button
                onClick={() => handleAction(onSend)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors first:rounded-t-lg"
              >
                <Send className="w-4 h-4" /> Enviar
              </button>
            )}
            {onSave && (
              <button
                onClick={() => handleAction(onSave)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              >
                <Star className="w-4 h-4" /> Favoritar
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => handleAction(onDelete)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors last:rounded-b-lg"
              >
                <Trash2 className="w-4 h-4" /> Descartar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
