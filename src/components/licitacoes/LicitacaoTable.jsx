import { Trash2 } from "lucide-react";
import { StatusBadge, formatValor, formatDataBr } from "./LicitacaoCard";
import ObjetoExpandivel from "./ObjetoExpandivel";
import MenuAcoes from "./MenuAcoes";
import BadgeUrgencia from "./BadgeUrgencia";

const renderColunaLicitacao = (l) => (
  <div className="space-y-1">
    <p className="font-semibold text-sm">{l.titulo}</p>
    <ObjetoExpandivel texto={l.objeto} textClassName="text-xs text-muted-foreground leading-relaxed" linhas="line-clamp-3" />
    <p className="text-xs font-medium text-foreground">{l.orgao || "—"}</p>
  </div>
);

export default function LicitacaoTable({
  licitacoes,
  onRowClick,
  selecionados,
  onToggleSelecao,
  onDelete,
  renderActions,
  renderGestao,
  colunasVisiveis,
}) {
  const comSelecao = !!onToggleSelecao;

  // Define as colunas e seu conteúdo
  const colunas = [
    {
      id: "licitacao",
      label: "Licitação",
      render: (l) => renderColunaLicitacao(l),
      className: "px-3 py-2.5 min-w-96",
    },
    {
      id: "status",
      label: "Status",
      render: (l) => l.status && <StatusBadge status={l.status} />,
      className: "px-3 py-2.5 w-24",
    },
    {
      id: "local",
      label: "Local",
      render: (l) => `${l.uf}${l.municipio ? ` · ${l.municipio}` : ""}`,
      className: "px-3 py-2.5 text-muted-foreground whitespace-nowrap",
    },
    {
      id: "modalidade",
      label: "Modalidade",
      render: (l) => l.tipo || "—",
      className: "px-3 py-2.5 text-muted-foreground",
    },
    {
      id: "publicacao",
      label: "Publicação",
      // Sem fallback: registros importados antes deste campo existir mostram "—"
      // em vez de fingir que a data de importação é a de publicação.
      render: (l) => formatDataBr(l.data_publicacao),
      className: "px-3 py-2.5 text-muted-foreground whitespace-nowrap",
    },
    {
      id: "sincronizacao",
      label: "Sincronização",
      // created_date cobre o histórico anterior ao campo data_sincronizacao.
      render: (l) => formatDataBr(l.data_sincronizacao || l.created_date),
      className: "px-3 py-2.5 text-muted-foreground whitespace-nowrap",
    },
    {
      id: "abertura",
      label: "Abertura",
      render: (l) => (
        <div className="flex flex-col gap-1 items-start">
          <span>{l.aberturaComHora || l.abertura || "—"}</span>
          <BadgeUrgencia abertura={l.abertura} abertura_datetime={l.abertura_datetime} />
        </div>
      ),
      className: "px-3 py-2.5 text-muted-foreground whitespace-nowrap",
    },
    {
      id: "valor",
      label: "Valor",
      render: (l) => formatValor(l.valor),
      className: "px-3 py-2.5 text-right font-semibold whitespace-nowrap w-24",
    },
  ];

  // Filtra colunas visíveis (Licitação sempre visível)
  const colunasExibidas = colunas.filter(
    (col) => col.id === "licitacao" || colunasVisiveis?.has(col.id)
  );

  return (
    <>
      {/* Tabela — desktop */}
      <div className="hidden md:block bg-card border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
              {comSelecao && (
                <th className="text-left font-medium px-3 py-2.5 w-10 sticky left-0 bg-muted/40">
                  <input
                    type="checkbox"
                    checked={selecionados?.size === licitacoes.length && licitacoes.length > 0}
                    onChange={(e) => licitacoes.forEach((l) => onToggleSelecao(l.id_licitacao, e.target.checked))}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
              )}
              {colunasExibidas.map((col) => (
                <th
                  key={col.id}
                  className={`text-left font-medium ${col.className} ${
                    col.id === "licitacao" ? "sticky left-10 bg-muted/40 z-10" : ""
                  }`}
                >
                  {col.label}
                </th>
              ))}
              {(onDelete || renderActions || renderGestao) && <th className="w-10 px-1 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {licitacoes.map((l) => (
              <tr
                key={l.id || l.id_licitacao}
                onClick={() => onRowClick?.(l)}
                className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
              >
                {comSelecao && (
                  <td className="px-3 py-2.5 sticky left-0 bg-card z-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selecionados?.has(l.id_licitacao) || false}
                      onChange={(e) => onToggleSelecao(l.id_licitacao, e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </td>
                )}
                {colunasExibidas.map((col) => (
                  <td
                    key={col.id}
                    className={`${col.className} ${
                      col.id === "licitacao" ? "sticky left-10 bg-card z-10" : ""
                    }`}
                  >
                    {col.render(l)}
                  </td>
                ))}
                {(onDelete || renderActions || renderGestao) && (
                  <td className="w-10 px-1 py-2.5 align-top" onClick={(e) => e.stopPropagation()}>
                    <MenuAcoes onDelete={onDelete ? () => onDelete(l) : undefined}>
                      {renderGestao && (
                        <div className="px-1 pb-2 mb-1 border-b w-52">
                          {renderGestao(l, { empilhado: true })}
                        </div>
                      )}
                      {renderActions?.(l)}
                    </MenuAcoes>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {licitacoes.map((l) => (
          <div
            key={l.id || l.id_licitacao}
            onClick={() => onRowClick?.(l)}
            className="bg-card border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {comSelecao && (
                  <input
                    type="checkbox"
                    checked={selecionados?.has(l.id_licitacao) || false}
                    onChange={(e) => onToggleSelecao(l.id_licitacao, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded cursor-pointer shrink-0"
                  />
                )}
              </div>
              {l.status && <StatusBadge status={l.status} />}
            </div>
            <div className="mt-1.5">
              <ObjetoExpandivel
                texto={l.objeto}
                textClassName="font-heading font-semibold text-sm leading-snug text-foreground"
                linhas="line-clamp-3"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-1.5">
              {l.titulo && <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium">{l.titulo}</span>}
              {l.orgao && <span className="font-medium text-foreground">{l.orgao}</span>}
              {l.busca_origem && <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium">{l.busca_origem}</span>}
              <span className="font-medium text-foreground">{l.uf}{l.municipio ? ` · ${l.municipio}` : ""}</span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t">
              <div className="text-xs">
                <span className="text-muted-foreground">Abertura: </span>
                <span className="font-medium">{l.aberturaComHora || l.abertura || "—"}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Valor</span>
                <span className="text-sm font-semibold">{formatValor(l.valor)}</span>
              </div>
            </div>
            {renderGestao && (
              <div className="pt-2 mt-2 border-t">{renderGestao(l)}</div>
            )}
            {(onDelete || renderActions) && (
              <div className="flex items-center gap-2 pt-2 mt-2 border-t" onClick={(e) => e.stopPropagation()}>
                {renderActions?.(l)}
                {onDelete && (
                  <button onClick={() => onDelete(l)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" /> Descartar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}