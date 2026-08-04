export default function BuscaMultiSelect({ options: buscas, value: selecionadas, onChange, disabled }) {
  const todasSelecionadas = buscas.length > 0 && selecionadas.length === buscas.length;

  const alternarTodas = () => {
    onChange(todasSelecionadas ? [] : buscas.map((busca) => busca.id));
  };

  const alternarBusca = (id) => {
    onChange(selecionadas.includes(id)
      ? selecionadas.filter((item) => item !== id)
      : [...selecionadas, id]);
  };

  return (
    <div className="min-w-[13rem] rounded-lg border bg-background p-2 text-sm">
      <p className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">Buscas para sincronizar</p>
      <div className="max-h-32 space-y-1 overflow-y-auto">
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
          <input type="checkbox" checked={todasSelecionadas} onChange={alternarTodas} disabled={disabled} />
          <span className="font-medium">Todas as buscas ativas</span>
        </label>
        {buscas.map((busca) => (
          <label key={busca.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
            <input
              type="checkbox"
              checked={selecionadas.includes(busca.id)}
              onChange={() => alternarBusca(busca.id)}
              disabled={disabled}
            />
            <span>{busca.nome}</span>
          </label>
        ))}
      </div>
    </div>
  );
}