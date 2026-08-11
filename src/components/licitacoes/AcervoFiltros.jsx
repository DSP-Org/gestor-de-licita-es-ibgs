
// Filtros da aba "Acervo": seleciona uma configuração de busca salva
export default function AcervoFiltros({
  buscasSalvas, filtroBuscaId, onChangeBuscaId,
}) {
  return (
    <div>
      <select
        value={filtroBuscaId}
        onChange={(e) => onChangeBuscaId(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Selecione uma busca salva...</option>
        {buscasSalvas.map((b) => (
          <option key={b.id} value={b.id}>{b.nome}</option>
        ))}
      </select>
    </div>
  );
}