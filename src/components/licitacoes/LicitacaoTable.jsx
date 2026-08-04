import { StatusBadge, formatValor } from "./LicitacaoCard";

export default function LicitacaoTable({ licitacoes, onRowClick }) {
  return (
    <div className="bg-card border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
            <th className="text-left font-medium px-3 py-2.5">ID</th>
            <th className="text-left font-medium px-3 py-2.5">Título</th>
            <th className="text-left font-medium px-3 py-2.5">Status</th>
            <th className="text-left font-medium px-3 py-2.5 hidden md:table-cell">Órgão</th>
            <th className="text-left font-medium px-3 py-2.5 hidden lg:table-cell">Local</th>
            <th className="text-left font-medium px-3 py-2.5 hidden lg:table-cell">Modalidade</th>
            <th className="text-left font-medium px-3 py-2.5 hidden md:table-cell">Abertura</th>
            <th className="text-right font-medium px-3 py-2.5">Valor</th>
          </tr>
        </thead>
        <tbody>
          {licitacoes.map((l) => (
            <tr
              key={l.id}
              onClick={() => onRowClick?.(l)}
              className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
            >
              <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{l.id_licitacao}</td>
              <td className="px-3 py-2.5 max-w-[260px]">
                <p className="font-medium line-clamp-1">{l.titulo}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{l.objeto}</p>
              </td>
              <td className="px-3 py-2.5">{l.status && <StatusBadge status={l.status} />}</td>
              <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground">{l.orgao || "—"}</td>
              <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground whitespace-nowrap">{l.uf}{l.municipio ? ` · ${l.municipio}` : ""}</td>
              <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground">{l.tipo || "—"}</td>
              <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground whitespace-nowrap">{l.aberturaComHora || l.abertura || "—"}</td>
              <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{formatValor(l.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}