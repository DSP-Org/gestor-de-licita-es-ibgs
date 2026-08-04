import { Trash2 } from "lucide-react";
import { StatusBadge, formatValor } from "./LicitacaoCard";

export default function LicitacaoTable({ licitacoes, onRowClick, selecionados, onToggleSelecao, onDelete, renderActions }) {
  const comSelecao = !!onToggleSelecao;
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
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
            <th className="text-left font-medium px-3 py-2.5 w-20 hidden sm:table-cell">ID</th>
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
              <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground truncate hidden sm:table-cell">{l.id_licitacao}</td>
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
  );
}