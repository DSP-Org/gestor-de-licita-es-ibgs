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
  const isNova = licitacao.status_leitura === "nova";

  return (
    <div className="relative">
      {isNova && (
        <div className="absolute -top-2.5 -right-2.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg z-10 border-2 border-card">
          ✨ Nova
        </div>
      )}
      <div
        className="bg-card border border-border/60 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer flex flex-col gap-3 active:scale-[0.98] w-full"
        onClick={onClick}
      >
        {/* Header com Título e Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-heading font-bold text-lg leading-tight text-foreground">{licitacao.titulo}</h3>
          </div>
          {licitacao.status && (
            <div className="shrink-0">
              <StatusBadge status={licitacao.status} />
            </div>
          )}
        </div>

        {/* Objeto */}
        {licitacao.objeto && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/40">
            <p className="text-sm leading-relaxed text-foreground">{licitacao.objeto}</p>
          </div>
        )}

        {/* Local e Modalidade */}
        <div className="flex flex-wrap gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">Localização</span>
            <p className="font-medium text-foreground">{licitacao.uf} • {licitacao.municipio}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">Modalidade</span>
            <p className="font-medium text-foreground">{licitacao.tipo || "—"}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* Footer com Datas e Valor */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold block mb-1">Publicação</span>
            <p className="font-semibold text-foreground">{licitacao.data_sincronizacao ? new Date(licitacao.data_sincronizacao).toLocaleDateString("pt-BR") : "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold block mb-1">Abertura</span>
            <p className="font-semibold text-foreground">{licitacao.abertura || "—"}</p>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold block mb-1">Valor</span>
            <p className="font-bold text-lg text-primary">{formatValor(licitacao.valor)}</p>
          </div>
        </div>

        {/* Ações */}
        {action && (
          <div className="pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </div>
    </div>
  );
}