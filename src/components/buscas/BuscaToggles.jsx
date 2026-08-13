import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Mail, Clock } from "lucide-react";
import { HORARIOS_SINCRONIZACAO } from "@/shared/alertaApi";

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

export default function BuscaToggles({ busca, onUpdated, modo = "alerta" }) {
  const [atualizando, setAtualizando] = useState(null);
  // O job de sincronização do Base44 espera uma string "HH:MM" neste campo.
  const [horario, setHorario] = useState(busca.horario_sincronizacao || "09:00");

  useEffect(() => {
    setHorario(busca.horario_sincronizacao || "09:00");
  }, [busca.horario_sincronizacao]);

  const atualizarCampo = async (campo, valor) => {
    setAtualizando(campo);
    try {
      await base44.entities.BuscaSalva.update(busca.id, { [campo]: valor });
      onUpdated?.(busca.id, campo, valor);
    } finally {
      setAtualizando(null);
    }
  };

  const mostrarEmail = modo === "alerta";
  const mostrarSync = modo === "sincronizacao";

  return (
    <div className={`gap-4 pt-4 border-t border-border/60 ${mostrarEmail ? "grid grid-cols-1" : "grid grid-cols-1 sm:grid-cols-2"}`}>
      {mostrarSync && (
        <Toggle
          label="Sincronização automática"
          icon={RefreshCw}
          checked={!!busca.ativa}
          onChange={(v) => atualizarCampo("ativa", v)}
          loading={atualizando === "ativa"}
          description="Participa da sync diária"
        />
      )}
      {mostrarEmail && (
        <Toggle
          label="Notificar por e-mail"
          icon={Mail}
          checked={busca.notificar_email !== false}
          onChange={(v) => atualizarCampo("notificar_email", v)}
          loading={atualizando === "notificar_email"}
          description="Envia e-mail ao achar novas"
        />
      )}
      {mostrarSync && (
        <label className="flex items-center gap-2.5 text-sm">
          <Clock className="w-4 h-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="font-medium block leading-tight">Horário da busca</span>
            <span className="text-[11px] text-muted-foreground">Seg a sex</span>
          </span>
          <select
            value={horario}
            disabled={atualizando === "horario_sincronizacao"}
            onChange={(e) => {
              setHorario(e.target.value);
              atualizarCampo("horario_sincronizacao", e.target.value);
            }}
            className="ml-auto w-24 px-2 py-1.5 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            {/* Um horário fora desta lista nunca seria disparado pelo cron. */}
            {!HORARIOS_SINCRONIZACAO.includes(horario) && <option value={horario}>{horario}</option>}
            {HORARIOS_SINCRONIZACAO.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}