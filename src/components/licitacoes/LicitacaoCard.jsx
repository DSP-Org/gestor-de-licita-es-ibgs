import { STATUS_OPTIONS } from "@/shared/alertaApi";

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
      className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-muted-foreground truncate">{licitacao.id_licitacao}</span>
        {licitacao.status && <StatusBadge status={licitacao.status} />}
      </div>
      <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2">{licitacao.titulo}</h3>
      <p className="text-xs text-muted-foreground line-clamp-2">{licitacao.objeto}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
        <span className="font-medium text-foreground">{licitacao.uf} · {licitacao.municipio}</span>
        <span>·</span>
        <span>{licitacao.tipo}</span>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
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