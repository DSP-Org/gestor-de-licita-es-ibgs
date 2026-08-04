import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Mail } from "lucide-react";

function Toggle({ label, icon: Icon, checked, onChange, loading, description }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={loading}
      className="flex items-center gap-2 text-sm disabled:opacity-50"
    >
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
      <Icon className={`w-4 h-4 ${checked ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-left">
        <span className="font-medium block leading-tight">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
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
    <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t">
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