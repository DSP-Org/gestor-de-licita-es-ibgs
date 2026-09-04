import { useMemo } from "react";
import { Clock, AlertTriangle, Calendar, CheckCircle } from "lucide-react";
import { calcularUrgenciaAbertura } from "@/lib/prazosLicitacao";

export default function BadgeUrgencia({ abertura_datetime, abertura, className = "" }) {
  const urgencia = useMemo(() => {
    return calcularUrgenciaAbertura(abertura_datetime, abertura);
  }, [abertura_datetime, abertura]);

  if (urgencia.tipo === "sem_data") return null;

  const Icone = urgencia.tipo === "hoje" || urgencia.tipo === "urgente"
    ? AlertTriangle
    : urgencia.tipo === "encerrada"
    ? CheckCircle
    : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] tracking-tight font-semibold border shadow-xs transition-all duration-300 ${urgencia.colorClass} ${className}`}
      title={urgencia.dtAbertura ? `Abertura: ${urgencia.dtAbertura.toLocaleString("pt-BR")}` : ""}
    >
      <Icone className="w-3 h-3 shrink-0 stroke-[2.2]" />
      <span>{urgencia.label}</span>
    </span>
  );
}
