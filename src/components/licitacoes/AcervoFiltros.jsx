import UfMultiSelect from "@/components/buscas/UfMultiSelect";
import OpcoesMultiSelect from "@/components/buscas/OpcoesMultiSelect";
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
  const filtrosPreenchidos =
    (filtroUf ? 1 : 0) + (filtroCidade ? 1 : 0) + (filtroModalidade ? 1 : 0) + (palavraChave?.trim() ? 1 : 0);
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
            <UfMultiSelect value={filtroUf} onChange={onChangeUf} />
            <OpcoesMultiSelect
              value={filtroCidade}
              onChange={onChangeCidade}
              options={cidadesDisponiveis}
              placeholder="Todas as cidades"
            />
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
          {filtrosPreenchidos < 2 && (
            <p className="text-xs text-amber-600">
              Selecione ao menos 2 filtros (estado, cidade, modalidade ou palavra-chave) para aplicar a busca livre.
            </p>
          )}
        </div>
      )}
    </div>
  );
}