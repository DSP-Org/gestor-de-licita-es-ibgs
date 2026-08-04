import { UFS, MODALIDADES } from "@/shared/alertaApi";

export default function LicitacaoFilters({ filtros, onChange, onBuscar, onLimpar, loading }) {
  const set = (campo, valor) => onChange({ ...filtros, [campo]: valor });

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Estado (UF)</label>
          <input
            list="uf-list"
            value={filtros.uf || ""}
            onChange={(e) => set("uf", e.target.value.toUpperCase())}
            placeholder="Ex: PR,SC"
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <datalist id="uf-list">
            {UFS.map((uf) => (
              <option key={uf} value={uf} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Palavras-chave</label>
          <input
            value={filtros.palavra_chave || ""}
            onChange={(e) => set("palavra_chave", e.target.value)}
            placeholder="Ex: engenharia, -limpeza"
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Modalidade</label>
          <select
            value={filtros.modalidade || ""}
            onChange={(e) => set("modalidade", e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas</option>
            {MODALIDADES.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Código IBGE do município</label>
          <input
            value={filtros.municipio_ibge || ""}
            onChange={(e) => set("municipio_ibge", e.target.value)}
            placeholder="7 dígitos"
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onBuscar}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar licitações"}
        </button>
        <button
          onClick={onLimpar}
          className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}