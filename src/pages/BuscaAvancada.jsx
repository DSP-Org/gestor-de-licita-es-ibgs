import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { STATUS_OPTIONS } from "@/shared/alertaApi";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";
import { escopoUnidade, unidadeEfetiva } from "@/lib/escopoUnidade";
import LicitacoesVisualizacao from "@/components/licitacoes/LicitacoesVisualizacao";
import AtualizacaoActions from "@/components/licitacoes/AtualizacaoActions";
import SeletorListaDialog from "@/components/licitacoes/SeletorListaDialog";
import { toArray } from "@/lib/toArray";
import { Search, Filter, Trash2, X } from "lucide-react";

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const MODALIDADES = [
  "Pregão",
  "Pregão eletrônico",
  "Pregão presencial",
  "Concorrência",
  "Convite",
  "Tomada de Preço",
  "Dispensa de Licitação",
  "Contratação Direta"
];

export default function BuscaAvancada() {
  const [filtros, setFiltros] = useState({
    ufs: [],
    municipios: [],
    modalidades: [],
    palavrasChave: [],
    dataAberturaInicio: "",
    dataAberturaFim: "",
    valorMinimo: "",
    valorMaximo: "",
    status: "",
  });
  const [inputPalavraChave, setInputPalavraChave] = useState("");
  const [buscarAPI, setBuscarAPI] = useState(false);
  const [dataPublicacaoAPIInicio, setDataPublicacaoAPIInicio] = useState("");
  const [dataPublicacaoAPIFim, setDataPublicacaoAPIFim] = useState("");

  const [licitacoes, setLicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [selecionados, setSelecionados] = useState([]);
  const [listasFavoritas, setListasFavoritas] = useState([]);
  // Licitações aguardando a escolha da lista no seletor.
  const [favoritando, setFavoritando] = useState(null);
  const { isAdmin, filtroUnidade, usuarioLogado } = useUnidadeFilter();

  useEffect(() => {
    if (!usuarioLogado) return;
    base44.entities.FavoritaLista
      .filter(escopoUnidade(isAdmin, filtroUnidade), "ordem", 100)
      .then((res) => setListasFavoritas(toArray(res)))
      .catch(() => setListasFavoritas([]));
  }, [isAdmin, filtroUnidade, usuarioLogado]);
  const [municipios, setMunicipios] = useState([]);

  // Carrega municípios quando UFs mudam
  useEffect(() => {
    if (filtros.ufs.length > 0) {
      carregarMunicipios(filtros.ufs);
    } else {
      setMunicipios([]);
    }
  }, [filtros.ufs]);

  async function carregarMunicipios(ufs) {
    try {
      const allMunicipios = new Set();

      for (const uf of ufs) {
        const dados = await base44.entities.Licitacao.filter(
          { uf },
          "-created_date",
          500
        );
        const lista = toArray(dados);
        lista.forEach(l => {
          if (l.municipio) allMunicipios.add(l.municipio);
        });
      }

      const municipiosUnicos = Array.from(allMunicipios).sort();
      setMunicipios(municipiosUnicos);
    } catch (err) {
      console.error("Erro ao carregar municípios:", err);
    }
  }

  async function executarBusca() {
    setCarregando(true);
    setErro("");

    try {
      const filtro = {};

      if (filtros.status) filtro.status = filtros.status;

      // Descartadas continuam no banco, mas não voltam nas buscas da unidade.
      filtro.oculto = { $ne: true };
      Object.assign(filtro, escopoUnidade(isAdmin, filtroUnidade));

      const dados = await base44.entities.Licitacao.filter(
        filtro,
        "-created_date",
        1000
      );

      // Filtros adicionais no cliente (UFs, modalidades, datas, valores e palavras-chave)
      let resultado = toArray(dados);

      // Filtrar por UFs
      if (filtros.ufs.length > 0) {
        resultado = resultado.filter(l => filtros.ufs.includes(l.uf));
      }

      // Filtrar por Municípios (só funciona com um único UF selecionado)
      if (filtros.municipios.length > 0) {
        resultado = resultado.filter(l => filtros.municipios.includes(l.municipio));
      }

      // Filtrar por Modalidades
      if (filtros.modalidades.length > 0) {
        resultado = resultado.filter(l => filtros.modalidades.includes(l.tipo));
      }

      // Filtrar por Palavras-chave (buscar todos os termos no título ou objeto)
      if (filtros.palavrasChave.length > 0) {
        resultado = resultado.filter(l => {
          const textoCompleto = `${l.titulo || ''} ${l.objeto || ''}`.toLowerCase();
          return filtros.palavrasChave.every(palavra =>
            textoCompleto.includes(palavra.toLowerCase())
          );
        });
      }

      if (filtros.dataAberturaInicio) {
        const dataInicio = new Date(filtros.dataAberturaInicio);
        resultado = resultado.filter(l => {
          const dataAbertura = l.abertura_datetime ? new Date(l.abertura_datetime) : null;
          return dataAbertura && dataAbertura >= dataInicio;
        });
      }

      if (filtros.dataAberturaFim) {
        const dataFim = new Date(filtros.dataAberturaFim);
        dataFim.setHours(23, 59, 59);
        resultado = resultado.filter(l => {
          const dataAbertura = l.abertura_datetime ? new Date(l.abertura_datetime) : null;
          return dataAbertura && dataAbertura <= dataFim;
        });
      }

      if (filtros.valorMinimo) {
        const min = parseFloat(filtros.valorMinimo);
        resultado = resultado.filter(l => {
          const valor = parseFloat(l.valor) || 0;
          return valor >= min;
        });
      }

      if (filtros.valorMaximo) {
        const max = parseFloat(filtros.valorMaximo);
        resultado = resultado.filter(l => {
          const valor = parseFloat(l.valor) || 0;
          return valor <= max;
        });
      }

      setLicitacoes(resultado);

      // TODO: Adicionar busca na API quando buscarAPI estiver ativado
      if (buscarAPI) {
        console.log("Busca na API ativada");
        console.log("Data publicação início:", dataPublicacaoAPIInicio);
        console.log("Data publicação fim:", dataPublicacaoAPIFim);
        // Aqui será adicionada a lógica de chamada à API de alertalicitacao.com.br
      }
    } catch (err) {
      setErro("Erro ao executar busca: " + err.message);
    } finally {
      setCarregando(false);
    }
  }

  function limparFiltros() {
    setFiltros({
      ufs: [],
      municipios: [],
      modalidades: [],
      palavrasChave: [],
      dataAberturaInicio: "",
      dataAberturaFim: "",
      valorMinimo: "",
      valorMaximo: "",
      status: "",
    });
    setInputPalavraChave("");
    setBuscarAPI(false);
    setDataPublicacaoAPIInicio("");
    setDataPublicacaoAPIFim("");
    setLicitacoes([]);
    setErro("");
  }

  function toggleUF(uf) {
    setFiltros(prev => {
      const novasUFs = prev.ufs.includes(uf)
        ? prev.ufs.filter(u => u !== uf)
        : [...prev.ufs, uf];
      return { ...prev, ufs: novasUFs, municipio: "" };
    });
  }

  function toggleModalidade(modalidade) {
    setFiltros(prev => ({
      ...prev,
      modalidades: prev.modalidades.includes(modalidade)
        ? prev.modalidades.filter(m => m !== modalidade)
        : [...prev.modalidades, modalidade]
    }));
  }

  function toggleMunicipio(municipio) {
    setFiltros(prev => ({
      ...prev,
      municipios: prev.municipios.includes(municipio)
        ? prev.municipios.filter(m => m !== municipio)
        : [...prev.municipios, municipio]
    }));
  }

  function adicionarPalavraChave() {
    if (inputPalavraChave.trim()) {
      setFiltros(prev => ({
        ...prev,
        palavrasChave: [...prev.palavrasChave, inputPalavraChave.trim()]
      }));
      setInputPalavraChave("");
    }
  }

  function removerPalavraChave(palavra) {
    setFiltros(prev => ({
      ...prev,
      palavrasChave: prev.palavrasChave.filter(p => p !== palavra)
    }));
  }

  function handleMudarFiltro(campo, valor) {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  }

  async function handleMarcarLeitura(licId, novoStatus) {
    try {
      await base44.entities.Licitacao.update(licId, { status_leitura: novoStatus });
      setLicitacoes(prev =>
        prev.map(l => l.id_licitacao === licId ? { ...l, status_leitura: novoStatus } : l)
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  }

  // Descartar apenas oculta: o registro continua no banco. Antes isto passava
  // id_licitacao onde o SDK espera o id do registro, então nada era gravado.
  async function handleDelete(licacao) {
    if (!confirm("Descartar esta licitação? Ela sai da sua lista, mas continua no banco.")) return;
    try {
      await base44.entities.Licitacao.update(licacao.id, { oculto: true });
      setLicitacoes(prev => prev.filter(l => l.id !== licacao.id));
    } catch (err) {
      console.error("Erro ao descartar:", err);
      alert("Erro ao descartar licitação");
    }
  }

  async function handleEnviarLicitacao(licacao) {
    const emails = prompt("Enviar para (e-mails separados por vírgula):");
    if (!emails) return;
    alert("Funcionalidade de envio em desenvolvimento");
  }

  // Favoritar abre o seletor de lista. Antes passava id_licitacao onde o SDK
  // espera o id do registro, então a gravação não acontecia.
  const handleFavoritarLicitacao = (licacao) => setFavoritando([licacao]);

  const criarListaFavorita = async (nome) => {
    // unidade_negocio_id: com uma unidade escolhida no seletor, a lista nasce dela.
    const nova = await base44.entities.FavoritaLista.create({
      nome,
      ordem: listasFavoritas.length,
      unidade_negocio_id: unidadeEfetiva(isAdmin, filtroUnidade, usuarioLogado),
    });
    setListasFavoritas((prev) => [...prev, nova]);
    return nova;
  };

  const confirmarFavoritar = async (listaId) => {
    const campos = { favorito: true, lista_favorita_id: listaId || "" };
    await base44.entities.Licitacao.bulkUpdate(favoritando.map((l) => ({ id: l.id, ...campos })));
    setLicitacoes((prev) =>
      prev.map((l) => (favoritando.some((f) => f.id === l.id) ? { ...l, ...campos } : l)),
    );
    setFavoritando(null);
  };

  function handleToggleSelecao(licId) {
    setSelecionados(prev =>
      prev.includes(licId)
        ? prev.filter(id => id !== licId)
        : [...prev, licId]
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Busca Avançada</h1>
          <p className="text-muted-foreground">Configure filtros avançados para encontrar licitações específicas</p>
        </div>

        {/* Painel de Filtros */}
        <div className="bg-card border rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Filtros</h2>
          </div>

          {/* Palavras-chave */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Palavras-chave</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Digite e pressione Enter ou clique em Adicionar"
                value={inputPalavraChave}
                onChange={(e) => setInputPalavraChave(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && adicionarPalavraChave()}
                className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={adicionarPalavraChave}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
              >
                Adicionar
              </button>
            </div>
            {filtros.palavrasChave.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filtros.palavrasChave.map(palavra => (
                  <div
                    key={palavra}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm"
                  >
                    <span>{palavra}</span>
                    <button
                      onClick={() => removerPalavraChave(palavra)}
                      className="hover:opacity-70"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estados (UF) - Checkboxes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Estados (UF) - Selecione um ou mais</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
              {ESTADOS.map(uf => (
                <label key={uf} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtros.ufs.includes(uf)}
                    onChange={() => toggleUF(uf)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{uf}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Município - Checkboxes (apenas com um UF selecionado) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Município - Selecione um ou mais
              {filtros.ufs.length > 1 && <span className="text-xs text-destructive ml-2">(Desabilitado com múltiplos UFs)</span>}
            </label>
            {filtros.ufs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Selecione um estado para ver os municípios</p>
            ) : filtros.ufs.length > 1 ? (
              <p className="text-sm text-destructive">Múltiplos estados selecionados. Selecione apenas um estado para filtrar por município.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {municipios.map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filtros.municipios.includes(m)}
                      onChange={() => toggleMunicipio(m)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-sm text-foreground">{m}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Modalidades - Checkboxes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Modalidades - Selecione uma ou mais</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {MODALIDADES.map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtros.modalidades.includes(m)}
                    onChange={() => toggleModalidade(m)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{m}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Status de Gestão</label>
            <select
              value={filtros.status}
              onChange={(e) => handleMudarFiltro("status", e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Filtros de Data e Valor */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Data de Abertura - Início */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Abertura - Início</label>
              <input
                type="date"
                value={filtros.dataAberturaInicio}
                onChange={(e) => handleMudarFiltro("dataAberturaInicio", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Data de Abertura - Fim */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Abertura - Fim</label>
              <input
                type="date"
                value={filtros.dataAberturaFim}
                onChange={(e) => handleMudarFiltro("dataAberturaFim", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Valor Mínimo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Valor Mínimo</label>
              <input
                type="number"
                placeholder="R$ 0,00"
                value={filtros.valorMinimo}
                onChange={(e) => handleMudarFiltro("valorMinimo", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Valor Máximo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Valor Máximo</label>
              <input
                type="number"
                placeholder="R$ 999.999,99"
                value={filtros.valorMaximo}
                onChange={(e) => handleMudarFiltro("valorMaximo", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Busca na API */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-muted">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="buscarAPI"
                checked={buscarAPI}
                onChange={(e) => setBuscarAPI(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="buscarAPI" className="text-sm font-medium text-foreground cursor-pointer">
                Buscar também na API (alertalicitacao.com.br)
              </label>
            </div>

            {buscarAPI && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Publicação na API - Início</label>
                  <input
                    type="date"
                    value={dataPublicacaoAPIInicio}
                    onChange={(e) => setDataPublicacaoAPIInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Publicação na API - Fim</label>
                  <input
                    type="date"
                    value={dataPublicacaoAPIFim}
                    onChange={(e) => setDataPublicacaoAPIFim(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={executarBusca}
              disabled={carregando}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {carregando ? "Buscando..." : "Buscar"}
            </button>
            <button
              onClick={limparFiltros}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-input text-foreground rounded-lg font-medium hover:bg-muted"
            >
              <Trash2 className="w-4 h-4" />
              Limpar
            </button>
            {licitacoes.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {licitacoes.length} resultado{licitacoes.length !== 1 ? "s" : ""} encontrado{licitacoes.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {erro && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {erro}
            </div>
          )}
        </div>

        {/* Resultados */}
        {licitacoes.length > 0 && (
          <LicitacoesVisualizacao
            licitacoes={licitacoes}
            loading={carregando}
            vazio={licitacoes.length === 0}
            onRowClick={(lic) => {}}
            selecionados={selecionados}
            onToggleSelecao={handleToggleSelecao}
            renderActions={(lic) => (
              <AtualizacaoActions
                onSend={() => handleEnviarLicitacao(lic)}
                onSave={() => handleFavoritarLicitacao(lic)}
                onDelete={() => handleDelete(lic)}
              />
            )}
          />
        )}

        {!carregando && licitacoes.length === 0 && !erro && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Configure os filtros e clique em "Buscar" para começar</p>
          </div>
        )}
      </div>

      {favoritando && (
        <SeletorListaDialog
          quantidade={favoritando.length}
          listas={listasFavoritas}
          onCriarLista={criarListaFavorita}
          onConfirm={confirmarFavoritar}
          onClose={() => setFavoritando(null)}
        />
      )}
    </div>
  );
}
