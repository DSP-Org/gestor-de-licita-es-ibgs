import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Mail, Clock, Plus, Trash2 } from "lucide-react";

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
  const horarios = Array.isArray(busca.horario_sincronizacao)
    ? busca.horario_sincronizacao
    : (busca.horario_sincronizacao ? [busca.horario_sincronizacao] : ["09:00"]);
  const [horariosLocais, setHorariosLocais] = useState(horarios);

  useEffect(() => {
    const novosHorarios = Array.isArray(busca.horario_sincronizacao)
      ? busca.horario_sincronizacao
      : (busca.horario_sincronizacao ? [busca.horario_sincronizacao] : ["09:00"]);
    setHorariosLocais(novosHorarios);
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

  const salvarHorarios = async (novosHorarios) => {
    setHorariosLocais(novosHorarios);
    await atualizarCampo("horario_sincronizacao", novosHorarios);
  };

  const adicionarHorario = () => {
    const novo = [...horariosLocais, "09:00"];
    salvarHorarios(novo);
  };

  const removerHorario = (index) => {
    if (horariosLocais.length > 1) {
      const novo = horariosLocais.filter((_, i) => i !== index);
      salvarHorarios(novo);
    }
  };

  const alterarHorario = (index, valor) => {
    const novo = [...horariosLocais];
    novo[index] = valor;
    setHorariosLocais(novo);
  };

  const finalizarEdicao = async (index) => {
    await salvarHorarios(horariosLocais);
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
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 text-sm">
            <Clock className="w-4 h-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="font-medium block leading-tight">Horários da busca</span>
              <span className="text-[11px] text-muted-foreground">Execução diária</span>
            </span>
          </div>
          <div className="space-y-2 ml-6">
            {horariosLocais.map((horario, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="time"
                  value={horario}
                  disabled={atualizando === "horario_sincronizacao"}
                  onChange={(e) => alterarHorario(index, e.target.value)}
                  onBlur={() => finalizarEdicao(index)}
                  className="w-20 px-2 py-1.5 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                {horariosLocais.length > 1 && (
                  <button
                    onClick={() => removerHorario(index)}
                    disabled={atualizando === "horario_sincronizacao"}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Remover horário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={adicionarHorario}
            disabled={atualizando === "horario_sincronizacao"}
            className="ml-6 inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar horário
          </button>
        </div>
      )}
    </div>
  );
}