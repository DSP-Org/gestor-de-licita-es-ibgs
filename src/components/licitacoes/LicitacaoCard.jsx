import { STATUS_OPTIONS } from "@/shared/alertaApi";
import BadgeUrgencia from "@/components/licitacoes/BadgeUrgencia";
import ObjetoExpandivel from "@/components/licitacoes/ObjetoExpandivel";
import { ExternalLink, MapPin, Calendar, DollarSign, FileText, Globe } from "lucide-react";

export function StatusBadge({ status }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${opt.color}`}>
      {opt.label}
    </span>
  );
}

export function formatValor(valor) {
  if (!valor) return "—";
  const n = Number(valor);
  if (isNaN(n)) return String(valor);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
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

  // Extrai nome do portal ou modalidade resumida
  const portalOrigem = licitacao.link_externo?.includes("bll") 
    ? "BLL COMPRAS"
    : licitacao.link_externo?.includes("comprasnet") || licitacao.link?.includes("comprasnet")
    ? "COMPRASNET"
    : licitacao.link_externo?.includes("licitacoes-e")
    ? "LICITAÇÕES-E"
    : licitacao.busca_origem || null;

  return (
    <div className="relative group">
      {isNova && (
        <div className="absolute -top-2.5 right-6 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-extrabold px-3 py-0.5 rounded-full shadow-md z-10 border-2 border-background ring-1 ring-primary/20">
          ✨ Nova
        </div>
      )}

      <div
        className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col gap-4 active:scale-[0.998] w-full relative overflow-hidden"
        onClick={onClick}
      >
        {/* Linha Superior: Checkbox, Título/Órgão, Localização e Badges à Direita */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {onToggleSelecao && (
              <input
                type="checkbox"
                checked={!!selecionado}
                onChange={(e) => onToggleSelecao(licitacao.id_licitacao, e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 mt-1 rounded cursor-pointer shrink-0 accent-primary"
              />
            )}
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="font-heading font-extrabold text-base sm:text-lg leading-snug text-foreground tracking-tight group-hover:text-primary transition-colors">
                {licitacao.orgao ? `${licitacao.orgao} — ` : ""}{licitacao.titulo}
              </h3>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                <span>
                  {licitacao.municipio ? `${licitacao.municipio} - ` : ""}
                  <strong className="text-foreground">{licitacao.uf || "UF"}</strong>
                </span>
                {licitacao.id_licitacao && (
                  <>
                    <span className="text-border mx-1">•</span>
                    <span className="text-[11px] text-muted-foreground">ID: #{licitacao.id_licitacao}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Badges de Destaque no estilo da referência */}
          <div className="flex flex-wrap items-center sm:justify-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {portalOrigem && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wider uppercase bg-purple-600 text-white shadow-xs">
                {portalOrigem}
              </span>
            )}
            {licitacao.tipo && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wider uppercase bg-blue-600 text-white shadow-xs">
                {licitacao.tipo}
              </span>
            )}
            {licitacao.status && <StatusBadge status={licitacao.status} />}
          </div>
        </div>

        {/* Grade Linear de Metadados: Edital, Publicação, Abertura e Valor */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 px-4 rounded-xl bg-muted/40 border border-border/50 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px] font-medium">Edital / Processo</span>
            <span className="font-bold text-foreground text-sm">
              {licitacao.id_licitacao ? `${licitacao.id_licitacao}` : "—"}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] font-medium">Publicação</span>
            <span className="font-semibold text-foreground text-sm">
              {formatDataBr(licitacao.data_publicacao)}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] font-medium">Abertura / Disputa</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-foreground text-sm">
                {licitacao.abertura || "—"}
              </span>
              <BadgeUrgencia abertura={licitacao.abertura} abertura_datetime={licitacao.abertura_datetime} />
            </div>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] font-medium">Valor Estimado</span>
            <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
              {formatValor(licitacao.valor)}
            </span>
          </div>
        </div>

        {/* Objeto Completo com leitura direta */}
        {licitacao.objeto && (
          <div className="text-xs text-foreground/90 leading-relaxed font-normal bg-background/60 rounded-xl p-3 border border-border/40" onClick={(e) => e.stopPropagation()}>
            <strong className="text-foreground font-bold mr-1">Objeto:</strong>
            <ObjetoExpandivel
              texto={licitacao.objeto}
              textClassName="text-xs text-foreground/90 leading-relaxed font-normal inline"
              linhas="line-clamp-3"
            />
          </div>
        )}

        {/* Gestão rápida inline (Lista de favoritos, Status operacional e Leitura) */}
        {gestao && (
          <div className="pt-2 border-t border-border/50">
            {gestao}
          </div>
        )}

        {/* Barra de Ações Rápidas em Pílulas (Estilo Licite Consulta) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap items-center gap-2">
            {linkEdital && (
              <a
                href={linkEdital}
                target="_blank"
                rel="noopener noreferrer"
                title="Acessar edital no portal oficial"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Portal / Edital</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}
            {licitacao.link && licitacao.link !== linkEdital && (
              <a
                href={licitacao.link}
                target="_blank"
                rel="noopener noreferrer"
                title="Ver no Alerta Licitação"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Alerta</span>
              </a>
            )}
          </div>

          {/* Botões do fluxo (Em Triagem, Minhas Licitações / Favoritas, Descartar) */}
          {action && (
            <div className="flex items-center gap-2">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}