import { Download, X, Share, PlusSquare } from "lucide-react";
import { useInstalarApp } from "@/hooks/useInstalarApp";

export default function InstalarAppPrompt() {
  const { podeMostrar, ios, instalar, dispensar, temPromptNativo } = useInstalarApp();

  if (!podeMostrar) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom duration-300">
        <button
          onClick={dispensar}
          className="absolute right-5 top-5 sm:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <img
            src="https://media.base44.com/images/public/6a720719f600bb866f6561f7/90a393f87_generated_image.png"
            alt="Licitalerta360"
            className="w-16 h-16 rounded-2xl shadow-md"
          />
          <div>
            <h2 className="font-heading text-lg font-bold">Instale o Licitalerta360</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione o app à tela inicial para acesso rápido, tela cheia e notificações.
            </p>
          </div>
        </div>

        {ios && !temPromptNativo ? (
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5">
              <Share className="w-4 h-4 text-primary shrink-0" />
              <span>1. Toque em <b>Compartilhar</b> no Safari</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5">
              <PlusSquare className="w-4 h-4 text-primary shrink-0" />
              <span>2. Escolha <b>Adicionar à Tela de Início</b></span>
            </div>
          </div>
        ) : (
          <button
            onClick={instalar}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Download className="w-4 h-4" /> Instalar aplicativo
          </button>
        )}

        <button
          onClick={dispensar}
          className="mt-2 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Continuar no navegador
        </button>
      </div>
    </div>
  );
}