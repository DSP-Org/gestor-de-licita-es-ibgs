import { Trash2 } from "lucide-react";
import { StatusBadge, formatValor } from "./LicitacaoCard";

export default function LicitacaoTable({ licitacoes, onRowClick, selecionados, onToggleSelecao, onDelete, renderActions }) {
  const comSelecao = !!onToggleSelecao;

  return (
    <>
      {/* Tabela — desktop */}
      <div className="hidden md:block bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
              {comSelecao && (
                <th className="text-left font-medium px-3 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={selecionados?.size === licitacoes.length && licitacoes.length > 0}
                    onChange={(e) => licitacoes.forEach((l) => onToggleSelecao(l.id_licitacao, e.target.checked))}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
              )}
              <th className="text-left font-medium px-3 py-2.5 w-20">ID</th>
              <th className="text-left font-medium px-3 py-2.5 hidden lg:table-cell">Busca</th>
              <th className="text-left font-medium px-3 py-2.5">Título</th>
              <th className="text-left font-medium px-3 py-2.5 w-20">Status</th>
              <th className="text-left font-medium px-3 py-2.5 hidden md:table-cell">Órgão</th>
              <th className="text-left font-medium px-3 py-2.5 hidden lg:table-cell">Local</th>
              <th className="text-left font-medium px-3 py-2.5 hidden lg:table-cell">Modalidade</th>
              <th className="text-left font-medium px-3 py-2.5 hidden md:table-cell">Abertura</th>
              <th className="text-left font-medium px-3 py-2.5 hidden lg:table-cell">Busca</th>
              <th className="text-right font-medium px-3 py-2.5 w-24">Valor</th>
              {(onDelete || renderActions) && <th className="px-3 py-2.5 w-40">Ações</th>}
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
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selecionados?.has(l.id_licitacao) || false}
                      onChange={(e) => onToggleSelecao(l.id_licitacao, e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground truncate">{l.id_licitacao}</td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground">{l.busca_origem || "—"}</td>
                <td className="px-3 py-2.5">
                  <p className="font-medium line-clamp-1">{l.titulo}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{l.objeto}</p>
                </td>
                <td className="px-3 py-2.5">{l.status && <StatusBadge status={l.status} />}</td>
                <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground">{l.orgao || "—"}</td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground whitespace-nowrap">{l.uf}{l.municipio ? ` · ${l.municipio}` : ""}</td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground">{l.tipo || "—"}</td>
                <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground whitespace-nowrap">{l.aberturaComHora || l.abertura || "—"}</td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground">{l.busca_origem || "—"}</td>
                <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{formatValor(l.valor)}</td>
                {(onDelete || renderActions) && (
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {renderActions?.(l)}
                      {onDelete && (
                        <button onClick={() => onDelete(l)} title="Excluir da lista" className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
                <span className="text-xs font-mono text-muted-foreground truncate">{l.id_licitacao}</span>
              </div>
              {l.status && <StatusBadge status={l.status} />}
            </div>
            <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 mt-1.5">{l.titulo}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{l.objeto}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-2">
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
            {(onDelete || renderActions) && (
              <div className="flex items-center gap-2 pt-2 mt-2 border-t" onClick={(e) => e.stopPropagation()}>
                {renderActions?.(l)}
                {onDelete && (
                  <button onClick={() => onDelete(l)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
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