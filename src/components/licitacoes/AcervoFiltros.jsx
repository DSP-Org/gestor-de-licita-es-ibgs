import { UFS } from "@/shared/alertaApi";
import PalavrasChaveInput from "@/components/buscas/PalavrasChaveInput";

// Filtros da aba "Acervo": ou seleciona uma configuração de busca salva,
// ou monta filtros livres (UF, cidade, modalidade e múltiplas palavras-chave).
export default function AcervoFiltros({
  modo, onChangeModo,
  buscasSalvas, filtroBuscaId, onChangeBuscaId,
  filtroUf, onChangeUf,
  filtroCidade, onChangeCidade, cidadesDisponiveis,
  filtroModalidade, onChangeModalidade, modalidadesDisponiveis,
  palavraChave, onChangePalavraChave, modoPalavras, onChangeModoPalavras,
}) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center border rounded-md overflow-hidden bg-background shrink-0">
        <button
          type="button"
          onClick={() => onChangeModo("config")}
          className={`px-3 py-2 text-xs font-medium ${modo === "config" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          Por configuração
        </button>
        <button
          type="button"
          onClick={() => onChangeModo("livre")}
          className={`px-3 py-2 text-xs font-medium border-l ${modo === "livre" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          Livre
        </button>
      </div>

      {modo === "config" ? (
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
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <select
              value={filtroUf}
              onChange={(e) => onChangeUf(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todos os estados</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
            <select
              value={filtroCidade}
              onChange={(e) => onChangeCidade(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todas as cidades</option>
              {cidadesDisponiveis.map((cidade) => (
                <option key={cidade} value={cidade}>{cidade}</option>
              ))}
            </select>
            <select
              value={filtroModalidade}
              onChange={(e) => onChangeModalidade(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todas as modalidades</option>
              {modalidadesDisponiveis.map((modalidade) => (
                <option key={modalidade} value={modalidade}>{modalidade}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Palavras-chave</label>
            <PalavrasChaveInput
              value={palavraChave}
              onChange={onChangePalavraChave}
              modo={modoPalavras}
              onChangeModo={onChangeModoPalavras}
            />
          </div>
        </div>
      )}
    </div>
  );
}