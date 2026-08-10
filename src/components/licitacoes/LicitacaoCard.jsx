import { STATUS_OPTIONS } from "@/shared/alertaApi";
import ObjetoExpandivel from "./ObjetoExpandivel";

export function StatusBadge({ status }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>
      {opt.label}
    </span>
  );
}

export function formatValor(valor) {
  if (!valor) return "—";
  const n = Number(valor);
  if (isNaN(n)) return String(valor);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function LicitacaoCard({ licitacao, onClick, action }) {
  return (
    <div
      className="bg-card border rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col gap-2 active:scale-[0.98]"
      onClick={onClick}
    >
      {licitacao.status && (
        <div className="flex items-start justify-end gap-2">
          <StatusBadge status={licitacao.status} />
        </div>
      )}
      <h3 className="font-heading font-semibold text-[15px] leading-snug line-clamp-2">{licitacao.titulo}</h3>
      <ObjetoExpandivel texto={licitacao.objeto} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
        <span className="font-medium text-foreground">{licitacao.uf} · {licitacao.municipio}</span>
        <span>·</span>
        <span>{licitacao.tipo}</span>
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t">
        <div className="text-xs">
          <span className="text-muted-foreground">Abertura: </span>
          <span className="font-medium">{licitacao.aberturaComHora || licitacao.abertura || "—"}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Valor</div>
          <div className="text-sm font-semibold">{formatValor(licitacao.valor)}</div>
        </div>
      </div>
      {action && (
        <div className="pt-2" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  );
}