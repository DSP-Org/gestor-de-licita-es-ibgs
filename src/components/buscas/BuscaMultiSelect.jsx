import { Check, ChevronDown } from "lucide-react";

export default function BuscaMultiSelect({ options, value, onChange, disabled }) {
  const todas = options.length > 0 && value.length === options.length;

  const alternar = (id) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <details className={`relative min-w-[13rem] ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
        <span>{todas ? "Todas as buscas ativas" : `${value.length} busca(s) selecionada(s)`}</span>
        <ChevronDown className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-card p-2 shadow-lg">
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted">
          <input type="checkbox" checked={todas} onChange={() => onChange(todas ? [] : options.map((item) => item.id))} />
          Todas as buscas
        </label>
        <div className="my-1 border-t" />
        {options.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
            <span className={`flex h-4 w-4 items-center justify-center rounded border ${value.includes(item.id) ? "bg-primary text-primary-foreground" : ""}`}>
              {value.includes(item.id) && <Check className="h-3 w-3" />}
            </span>
            <input className="sr-only" type="checkbox" checked={value.includes(item.id)} onChange={() => alternar(item.id)} />
            {item.nome}
          </label>
        ))}
      </div>
    </details>
  );
}