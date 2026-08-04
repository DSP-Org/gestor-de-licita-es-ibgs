import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Mail } from "lucide-react";

function Toggle({ label, icon: Icon, checked, onChange, loading, description }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={loading}
      className="flex items-center gap-2.5 text-sm disabled:opacity-50 group"
    >
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${checked ? "bg-primary" : "bg-muted-foreground/25 group-hover:bg-muted-foreground/40"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
      <Icon className={`w-4 h-4 shrink-0 transition-colors ${checked ? "text-primary" : "text-muted-foreground/60"}`} />
      <span className="text-left">
        <span className="font-medium block leading-tight">{label}</span>
        {description && <span className="text-[11px] text-muted-foreground leading-tight">{description}</span>}
      </span>
    </button>
  );
}

export default function BuscaToggles({ busca, onUpdated }) {
  const [atualizando, setAtualizando] = useState(null);

  const toggleCampo = async (campo, valor) => {
    setAtualizando(campo);
    try {
      await base44.entities.BuscaSalva.update(busca.id, { [campo]: valor });
      onUpdated?.(busca.id, campo, valor);
    } finally {
      setAtualizando(null);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60">
      <Toggle
        label="Sincronização automática"
        icon={RefreshCw}
        checked={!!busca.ativa}
        onChange={(v) => toggleCampo("ativa", v)}
        loading={atualizando === "ativa"}
        description="Participa da sync diária"
      />
      <Toggle
        label="Notificar por e-mail"
        icon={Mail}
        checked={busca.notificar_email !== false}
        onChange={(v) => toggleCampo("notificar_email", v)}
        loading={atualizando === "notificar_email"}
        description="Envia e-mail ao achar novas"
      />
    </div>
  );
}