import { STATUS_OPTIONS } from "@/shared/alertaApi";
import BadgeUrgencia from "@/components/licitacoes/BadgeUrgencia";
import ObjetoExpandivel from "@/components/licitacoes/ObjetoExpandivel";
import { ExternalLink, Building2 } from "lucide-react";

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
  selecionado,
  onToggleSelecao,
  gestao,
}) {
  const isNova = licitacao.status_leitura === "nova";
  const linkEdital = licitacao.link_externo || licitacao.link;

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
        
        {/* Header com Checkbox, Título, Status e Link Direto do Edital */}
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
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-base sm:text-lg leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {licitacao.titulo}
            </h3>
            {licitacao.orgao && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 font-medium truncate">
                <Building2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span>{licitacao.orgao}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {licitacao.status && <StatusBadge status={licitacao.status} />}
            {linkEdital && (
              <a
                href={linkEdital}
                target="_blank"
                rel="noopener noreferrer"
                title="Acessar edital no portal oficial"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-full transition-colors"
              >
                <span>Edital</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Objeto com expansão inline sem abrir modal */}
        {licitacao.objeto && (
          <div className="bg-muted/30 rounded-xl p-3 border border-border/40" onClick={(e) => e.stopPropagation()}>
            <ObjetoExpandivel
              texto={licitacao.objeto}
              textClassName="text-xs text-foreground/90 leading-relaxed font-normal"
              linhas="line-clamp-3"
            />
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