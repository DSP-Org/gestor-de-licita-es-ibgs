import { useState } from "react";
import { Bookmark, Settings } from "lucide-react";
import BuscasSalvas from "@/pages/BuscasSalvas";
import Configuracoes from "@/pages/Configuracoes";

const TABS = [
  { id: "buscas", label: "Buscas salvas", icon: Bookmark },
  { id: "automacao", label: "Automação e notificações", icon: Settings },
];

export default function BuscasEAutomacao() {
  const [tab, setTab] = useState("buscas");

  return (
    <div>
      <div className="px-4 sm:px-6 pt-4">
        <div className="max-w-5xl mx-auto flex gap-1 p-1 bg-muted rounded-xl w-full sm:w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      {tab === "buscas" ? <BuscasSalvas /> : <Configuracoes />}
    </div>
  );
}