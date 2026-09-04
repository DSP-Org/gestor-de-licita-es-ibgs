import { STATUS_OPTIONS } from "@/shared/alertaApi";
import BadgeUrgencia from "@/components/licitacoes/BadgeUrgencia";

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

export function formatDataBr(dataStr) {
  if (!dataStr) return "—";
  // Aceita "dd/mm/aaaa", "aaaa-mm-dd" e timestamps ISO completos (created_date).
  const texto = String(dataStr);
  if (texto.includes("/")) return texto;
  const partes = texto.split("T")[0].split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return texto;
}

export default function LicitacaoCard({
  licitacao,
  onClick,
  action,
  // Opcionais: usados pelo LicitacoesVisualizacao. FavoritasTab passa só
  // licitacao/onClick/action e continua funcionando sem eles.
  selecionado,
  onToggleSelecao,
  gestao,
}) {
  const isNova = licitacao.status_leitura === "nova";

  return (
    <div className="relative">
      {isNova && (
        <div className="absolute -top-2.5 -right-2.5 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full shadow-md z-10 border-2 border-background ring-1 ring-primary/20">
          ✨ Nova
        </div>
      )}
      <div
        className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs hover:shadow-xl hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 cubic-bezier(0.32,0.72,0,1) cursor-pointer flex flex-col gap-3.5 active:scale-[0.99] w-full group relative overflow-hidden"
        onClick={onClick}
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {/* Header com Título e Status */}
        <div className="flex items-start justify-between gap-3">
          {onToggleSelecao && (
            <input
              type="checkbox"
              checked={!!selecionado}
              onChange={(e) => onToggleSelecao(licitacao.id_licitacao, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 mt-1 rounded cursor-pointer shrink-0"
            />
          )}
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
            <p className="font-semibold text-foreground">{formatDataBr(licitacao.data_publicacao)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold block mb-1">Abertura</span>
            <div className="flex flex-col gap-1 items-start">
              <p className="font-semibold text-foreground">{licitacao.abertura || "—"}</p>
              <BadgeUrgencia abertura={licitacao.abertura} abertura_datetime={licitacao.abertura_datetime} />
            </div>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold block mb-1">Valor</span>
            <p className="font-bold text-lg text-primary">{formatValor(licitacao.valor)}</p>
          </div>
        </div>

        {/* Gestão rápida: lista, status e leitura */}
        {gestao && <div className="pt-2 border-t border-border/40">{gestao}</div>}

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