import { useState, useEffect } from "react";
import { UFS, MODALIDADES } from "@/shared/alertaApi";

export default function LicitacaoFilters({ filtros, onChange, onBuscar, onLimpar, loading }) {
  const [municipios, setMunicipios] = useState([]);
  const [carregandoMun, setCarregandoMun] = useState(false);
  const set = (campo, valor) => onChange({ ...filtros, [campo]: valor });

  // Busca municípios do IBGE quando a UF muda
  useEffect(() => {
    const uf = (filtros.uf || "").trim();
    if (!uf || uf.includes(",")) {
      setMunicipios([]);
      return;
    }
    let cancelado = false;
    setCarregandoMun(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      .then((r) => r.json())
      .then((lista) => {
        if (!cancelado) setMunicipios(Array.isArray(lista) ? lista : []);
      })
      .catch(() => !cancelado && setMunicipios([]))
      .finally(() => !cancelado && setCarregandoMun(false));
    return () => { cancelado = true; };
  }, [filtros.uf]);

  const selecionarMunicipio = (nome) => {
    const mun = municipios.find((m) => m.nome === nome);
    if (mun) {
      onChange({ ...filtros, municipio_nome: nome, municipio_ibge: String(mun.id) });
    } else {
      onChange({ ...filtros, municipio_nome: nome });
    }
  };

  const temFiltro = !!(filtros.uf || filtros.palavra_chave || filtros.modalidade || filtros.municipio_ibge);

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          <label className="text-xs font-medium text-muted-foreground">
            Município (por nome) {filtros.uf && !filtros.uf.includes(",") && !carregandoMun && `(${municipios.length})`}
          </label>
          <input
            list="mun-list"
            value={filtros.municipio_nome || ""}
            onChange={(e) => selecionarMunicipio(e.target.value)}
            disabled={!filtros.uf || filtros.uf.includes(",")}
            placeholder={filtros.uf && !filtros.uf.includes(",") ? "Selecione a cidade" : "Informe uma UF primeiro"}
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <datalist id="mun-list">
            {municipios.map((m) => (
              <option key={m.id} value={m.nome} />
            ))}
          </datalist>
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
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onBuscar}
          disabled={loading || !temFiltro}
          title={!temFiltro ? "Informe ao menos um filtro para buscar" : ""}
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
        {!temFiltro && (
          <span className="text-xs text-amber-600">A busca requer ao menos um filtro.</span>
        )}
      </div>
    </div>
  );
}