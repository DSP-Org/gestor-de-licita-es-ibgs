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
      className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col gap-2 active:scale-[0.98] w-full"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading font-semibold text-sm leading-snug flex-1">{licitacao.titulo}</h3>
        {licitacao.status && (
          <StatusBadge status={licitacao.status} />
        )}
      </div>

      {licitacao.objeto && (
        <p className="text-xs text-muted-foreground leading-relaxed">{licitacao.objeto}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{licitacao.uf} · {licitacao.municipio}</span>
        <span>·</span>
        <span>{licitacao.tipo}</span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t text-xs">
        <div className="flex gap-4">
          <div>
            <span className="text-muted-foreground">Publ: </span>
            <span className="font-medium">{licitacao.data_sincronizacao ? new Date(licitacao.data_sincronizacao).toLocaleDateString("pt-BR") : "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Abertura: </span>
            <span className="font-medium">{licitacao.abertura || "—"}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-muted-foreground">Valor</div>
          <div className="font-semibold">{formatValor(licitacao.valor)}</div>
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