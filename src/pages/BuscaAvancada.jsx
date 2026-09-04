import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { MODALIDADES as MODALIDADES_API, buscarLicitacoes } from "@/shared/alertaApi";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";
import { escopoUnidade, unidadeEfetiva } from "@/lib/escopoUnidade";
import LicitacoesVisualizacao from "@/components/licitacoes/LicitacoesVisualizacao";
import AtualizacaoActions from "@/components/licitacoes/AtualizacaoActions";
import SeletorListaDialog from "@/components/licitacoes/SeletorListaDialog";
import { toArray } from "@/lib/toArray";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
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
  });
  const [inputPalavraChave, setInputPalavraChave] = useState("");
  const [buscarAPI, setBuscarAPI] = useState(false);
  const [dataPublicacaoAPIInicio, setDataPublicacaoAPIInicio] = useState("");
  const [dataPublicacaoAPIFim, setDataPublicacaoAPIFim] = useState("");
  const [buscarPNCP, setBuscarPNCP] = useState(false);

  const [licitacoes, setLicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [selecionados, setSelecionados] = useState(new Set());
  const [listasFavoritas, setListasFavoritas] = useState([]);
  // Licitações aguardando a escolha da lista no seletor.
  const [favoritando, setFavoritando] = useState(null);
  const { isAdmin, filtroUnidade, usuarioLogado } = useUnidadeFilter();

  // Quantos resultados já são registro da unidade ativa (têm `.id`) vs vieram
  // só do banco do sistema/API e ainda não foram materializados.
  const qtdJaNaUnidade = useMemo(() => licitacoes.filter((l) => l.id).length, [licitacoes]);

  useEffect(() => {
    if (!usuarioLogado) return;
    base44.entities.FavoritaLista
      .filter(escopoUnidade(isAdmin, filtroUnidade), "ordem", 100)
      .then((res) => setListasFavoritas(toArray(res)))
      .catch(() => setListasFavoritas([]));
  }, [isAdmin, filtroUnidade, usuarioLogado]);
  const [municipios, setMunicipios] = useState([]);
  const [buscaMunicipio, setBuscaMunicipio] = useState("");

  // Selecionados sempre no topo (pra desmarcar sem caçar na lista); os demais
  // seguem alfabéticos e filtrados pelo texto de busca.
  const municipiosOrdenados = useMemo(() => {
    const termo = buscaMunicipio.trim().toLowerCase();
    const selecionados = municipios.filter((m) => filtros.municipios.includes(m));
    const naoSelecionados = municipios.filter((m) => !filtros.municipios.includes(m));
    const filtrados = termo
      ? naoSelecionados.filter((m) => m.toLowerCase().includes(termo))
      : naoSelecionados;
    return [...selecionados, ...filtrados];
  }, [municipios, filtros.municipios, buscaMunicipio]);

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
      // Busca Avançada pertence ao sistema, não à unidade: a base é o
      // ConsultaCache (banco global, compartilhado por toda busca já feita
      // por qualquer unidade), sobreposto com os registros da PRÓPRIA unidade
      // (Licitacao) quando existirem — é de lá que vem favorito/status/leitura.
      const [cachesList, licitacoesDb] = await Promise.all([
        base44.entities.ConsultaCache.list("-updated_date", 1000),
        base44.entities.Licitacao.filter(escopoUnidade(isAdmin, filtroUnidade), "-updated_date", 2000),
      ]);

      const licitacoesDbMap = new Map();
      for (const l of toArray(licitacoesDb)) {
        if (l.id_licitacao) licitacoesDbMap.set(String(l.id_licitacao), l);
      }

      const poolMap = new Map();
      for (const cache of toArray(cachesList)) {
        for (const l of toArray(cache.resultado?.licitacoes)) {
          if (l?.id_licitacao && !poolMap.has(l.id_licitacao)) {
            poolMap.set(l.id_licitacao, l);
          }
        }
      }
      // Garante que registros já vinculados à unidade apareçam mesmo que
      // tenham saído da janela recente do cache.
      for (const [id, l] of licitacoesDbMap) {
        if (!poolMap.has(id)) poolMap.set(id, l);
      }

      // Filtros adicionais no cliente (UFs, modalidades, datas, valores e palavras-chave)
      let resultado = Array.from(poolMap.values()).map((l) => {
        const doBanco = licitacoesDbMap.get(String(l.id_licitacao));
        return doBanco ? { ...l, ...doBanco } : l;
      });

      // Descartada é um conceito da unidade — some da lista assim que marcada.
      resultado = resultado.filter((l) => !l.oculto);

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

      // Busca integrada na API externa (Alerta Licitação)
      if (buscarAPI) {
        try {
          const ufsParaBuscar = filtros.ufs.length > 0 ? filtros.ufs : [undefined];
          const modalidadesCodigos = filtros.modalidades
            .map(modNome => MODALIDADES_API.find(m => m.nome.toLowerCase() === modNome.toLowerCase())?.id)
            .filter(Boolean);
          const modalidadeParaBuscar = modalidadesCodigos.length > 0 ? modalidadesCodigos.join(",") : undefined;
          const palavraChaveParaBuscar = filtros.palavrasChave.length > 0 ? filtros.palavrasChave.join(", ") : undefined;

          // Executa as consultas na API para cada UF selecionada (ou consulta geral se nenhuma UF selecionada)
          const chamadasApi = ufsParaBuscar.map(uf =>
            buscarLicitacoes({
              data_inicio: dataPublicacaoAPIInicio || undefined,
              data_fim: dataPublicacaoAPIFim || undefined,
              uf: uf || undefined,
              modalidade: modalidadeParaBuscar,
              palavra_chave: palavraChaveParaBuscar,
              pagina: 1,
              licitacoesPorPagina: 50,
            })
          );

          const respostas = await Promise.all(chamadasApi);
          const apiLicitacoes = [];
          for (const res of respostas) {
            if (res?.licitacoes) {
              apiLicitacoes.push(...toArray(res.licitacoes));
            }
          }

          if (apiLicitacoes.length > 0) {
            // Mesclar e remover duplicatas pelo id_licitacao
            const idsLocais = new Set(resultado.map(l => l.id_licitacao));
            const novasDaApi = apiLicitacoes.filter(l => !idsLocais.has(l.id_licitacao));
            resultado = [...resultado, ...novasDaApi];
          }
        } catch (apiErr) {
          console.error("Erro na busca da API:", apiErr);
          setErro("Aviso: Falha ao buscar na API, mostrando apenas resultados locais. " + apiErr.message);
        }
      }

      // Busca direta no PNCP (fonte pública do sistema, sem depender do Alerta Licitação)
      if (buscarPNCP) {
        try {
          const ufsParaBuscar = filtros.ufs.length > 0 ? filtros.ufs : [undefined];
          const modalidadesCodigos = filtros.modalidades
            .map(modNome => MODALIDADES_API.find(m => m.nome.toLowerCase() === modNome.toLowerCase())?.id)
            .filter(Boolean);

          const chamadasPncp = ufsParaBuscar.map(uf =>
            buscarLicitacoes({
              fonte: "pncp",
              data_insercao: dataPublicacaoAPIInicio || undefined,
              uf: uf || undefined,
              modalidade: modalidadesCodigos.join(","),
              pagina: 1,
              licitacoesPorPagina: 50,
            })
          );

          const respostasPncp = await Promise.all(chamadasPncp);
          const pncpLicitacoes = [];
          for (const res of respostasPncp) {
            if (res?.licitacoes) pncpLicitacoes.push(...toArray(res.licitacoes));
          }

          if (pncpLicitacoes.length > 0) {
            const idsLocais = new Set(resultado.map(l => l.id_licitacao));
            const novasDoPncp = pncpLicitacoes.filter(l => !idsLocais.has(l.id_licitacao));
            resultado = [...resultado, ...novasDoPncp];
          }
        } catch (pncpErr) {
          console.error("Erro na busca do PNCP:", pncpErr);
          setErro((prevErro) => `${prevErro ? prevErro + " " : ""}Aviso: falha ao buscar no PNCP. ${pncpErr.message}`);
        }
      }

      setLicitacoes(resultado);
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
    });
    setInputPalavraChave("");
    setBuscarAPI(false);
    setBuscarPNCP(false);
    setDataPublicacaoAPIInicio("");
    setDataPublicacaoAPIFim("");
    setLicitacoes([]);
    setSelecionados(new Set());
    setErro("");
  }

  function toggleUF(uf) {
    setFiltros(prev => {
      const novasUFs = prev.ufs.includes(uf)
        ? prev.ufs.filter(u => u !== uf)
        : [...prev.ufs, uf];
      return { ...prev, ufs: novasUFs, municipios: [] };
    });
    setBuscaMunicipio("");
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

  // Garante que a licitação existe como registro DESTA unidade antes de
  // qualquer ação — resultado vindo só do banco do sistema (ConsultaCache) ou
  // da API ainda não tem `.id` até isso rodar (nasce "nova" na unidade agora).
  async function garantirNaUnidade(licacao, camposExtra = {}) {
    if (licacao.id) return licacao;
    const criada = await base44.entities.Licitacao.create({
      unidade_negocio_id: unidadeEfetiva(isAdmin, filtroUnidade, usuarioLogado),
      id_licitacao: licacao.id_licitacao,
      titulo: licacao.titulo,
      objeto: licacao.objeto,
      uf: licacao.uf,
      municipio: licacao.municipio,
      municipio_ibge: licacao.municipio_IBGE || licacao.municipio_ibge,
      orgao: licacao.orgao,
      abertura_datetime: licacao.abertura_datetime,
      abertura: licacao.abertura,
      tipo: licacao.tipo,
      id_tipo: licacao.id_tipo,
      valor: licacao.valor,
      link: licacao.link,
      link_externo: licacao.linkExterno || licacao.link_externo,
      status: "interessado",
      status_leitura: "nova",
      oculto: false,
      favorito: false,
      ...camposExtra,
    });
    return { ...licacao, id: criada.id };
  }

  // Descartar apenas oculta: o registro continua no banco.
  async function handleDelete(licacao) {
    if (!confirm("Descartar esta licitação? Ela sai da sua lista, mas continua no banco.")) return;
    try {
      const registrada = await garantirNaUnidade(licacao, { oculto: true });
      if (registrada.id === licacao.id && licacao.id) {
        await base44.entities.Licitacao.update(licacao.id, { oculto: true });
      }
      setLicitacoes(prev => prev.filter(l => l.id_licitacao !== licacao.id_licitacao));
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

  // Mover para Em Triagem
  async function handleMoverParaTriagem(licacao) {
    try {
      const registrada = await garantirNaUnidade(licacao, { status_leitura: "vista", status: "em_analise" });
      if (registrada.id === licacao.id && licacao.id) {
        await base44.entities.Licitacao.update(licacao.id, {
          status_leitura: "vista",
          status: "em_analise",
          oculto: false,
        });
      }
      setLicitacoes((prev) =>
        prev.map((l) =>
          l.id_licitacao === licacao.id_licitacao
            ? { ...l, id: registrada.id, status_leitura: "vista", status: "em_analise" }
            : l
        )
      );
      alert("Licitação enviada para Em Triagem!");
    } catch (err) {
      console.error("Erro ao mover para triagem:", err);
      alert("Erro ao enviar para triagem: " + err.message);
    }
  }

  // Favoritar abre o seletor de lista.
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
    // Materializa antes quem ainda não é registro da unidade (veio do banco do
    // sistema ou da API), senão o bulkUpdate abaixo recebe `id` undefined.
    const registradas = await Promise.all(favoritando.map((l) => garantirNaUnidade(l)));
    await base44.entities.Licitacao.bulkUpdate(registradas.map((l) => ({ id: l.id, ...campos })));
    const idsOriginais = new Set(favoritando.map((f) => f.id_licitacao));
    setLicitacoes((prev) =>
      prev.map((l) => {
        if (!idsOriginais.has(l.id_licitacao)) return l;
        const registrada = registradas.find((r) => r.id_licitacao === l.id_licitacao);
        return { ...l, id: registrada?.id || l.id, ...campos };
      }),
    );
    setFavoritando(null);
  };

  function handleToggleSelecao(licId) {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(licId)) novo.delete(licId);
      else novo.add(licId);
      return novo;
    });
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

          {/* Cada grupo de filtro é uma seção colapsável — só uma aberta por
              vez (Accordion single+collapsible), pra não poluir a tela com
              tudo expandido ao mesmo tempo. */}
          <Accordion type="single" collapsible className="space-y-2 mb-6">
            <AccordionItem value="palavras" className="border rounded-lg px-4">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  Palavras-chave
                  {filtros.palavrasChave.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">
                      {filtros.palavrasChave.length}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
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
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="uf" className="border rounded-lg px-4">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  Estados (UF)
                  {filtros.ufs.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">
                      {filtros.ufs.length}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
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
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="municipio" className="border rounded-lg px-4">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  Município
                  {filtros.municipios.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">
                      {filtros.municipios.length}
                    </span>
                  )}
                  {filtros.ufs.length > 1 && <span className="text-xs text-destructive">(Desabilitado com múltiplos UFs)</span>}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {filtros.ufs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Selecione um estado para ver os municípios</p>
                ) : filtros.ufs.length > 1 ? (
                  <p className="text-sm text-destructive">Múltiplos estados selecionados. Selecione apenas um estado para filtrar por município.</p>
                ) : (
                  <>
                    <input
                      type="text"
                      value={buscaMunicipio}
                      onChange={(e) => setBuscaMunicipio(e.target.value)}
                      placeholder="Filtrar municípios..."
                      className="w-full px-3 py-2 mb-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto border border-border/60 rounded-lg p-3">
                      {municipiosOrdenados.length === 0 ? (
                        <p className="text-sm text-muted-foreground col-span-full">Nenhum município encontrado.</p>
                      ) : (
                        municipiosOrdenados.map(m => (
                          <label key={m} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filtros.municipios.includes(m)}
                              onChange={() => toggleMunicipio(m)}
                              className="w-4 h-4 rounded cursor-pointer"
                            />
                            <span className={`text-sm ${filtros.municipios.includes(m) ? "font-semibold text-primary" : "text-foreground"}`}>{m}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="modalidades" className="border rounded-lg px-4">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  Modalidades
                  {filtros.modalidades.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">
                      {filtros.modalidades.length}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
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
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="datas-valor" className="border rounded-lg px-4">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  Abertura e Valor
                  {(filtros.dataAberturaInicio || filtros.dataAberturaFim || filtros.valorMinimo || filtros.valorMaximo) && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">ativo</span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Abertura - Início</label>
                    <input
                      type="date"
                      value={filtros.dataAberturaInicio}
                      onChange={(e) => handleMudarFiltro("dataAberturaInicio", e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Abertura - Fim</label>
                    <input
                      type="date"
                      value={filtros.dataAberturaFim}
                      onChange={(e) => handleMudarFiltro("dataAberturaFim", e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

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
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fontes-externas" className="border rounded-lg px-4">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  Fontes Externas
                  {(buscarAPI || buscarPNCP) && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">ativo</span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-3">
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
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="buscarPNCP"
                      checked={buscarPNCP}
                      onChange={(e) => setBuscarPNCP(e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <label htmlFor="buscarPNCP" className="text-sm font-medium text-foreground cursor-pointer">
                      Buscar direto no PNCP (Portal Nacional de Contratações Públicas)
                    </label>
                  </div>
                  {buscarPNCP && filtros.modalidades.length === 0 && (
                    <p className="text-xs text-amber-600 pl-7">
                      ⚠️ O PNCP exige modalidade — escolha ao menos uma em "Modalidades" (Concorrência, Leilão, Pregão eletrônico/presencial, Dispensas ou Chamamento público).
                    </p>
                  )}
                </div>

                {(buscarAPI || buscarPNCP) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Publicação - Início</label>
                        <input
                          type="date"
                          value={dataPublicacaoAPIInicio}
                          onChange={(e) => setDataPublicacaoAPIInicio(e.target.value)}
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Publicação - Fim</label>
                        <input
                          type="date"
                          value={dataPublicacaoAPIFim}
                          onChange={(e) => setDataPublicacaoAPIFim(e.target.value)}
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>Dica de velocidade:</strong> Se não preencher as datas, a busca considera o dia de hoje (no PNCP, o que está com propostas abertas agora) com resposta instantânea. Intervalos longos consultam dia a dia em paralelo (só no Alerta Licitação — o PNCP usa sempre a data de início).
                    </p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

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
          </div>

          {licitacoes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs px-3 py-1.5 rounded-full font-bold bg-primary/10 text-primary">
                {licitacoes.length} resultado{licitacoes.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                {qtdJaNaUnidade} já na sua unidade
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full font-bold bg-muted text-muted-foreground">
                {licitacoes.length - qtdJaNaUnidade} só no banco do sistema
              </span>
            </div>
          )}

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
            tagEstado={(lic) => {
              // Sem `.id` é resultado só do banco do sistema/API, ainda não
              // vinculado a esta unidade — sem etiqueta, pra não sugerir que já
              // está em algum estágio do funil que ainda não existe pra ela.
              if (!lic.id) return null;
              if (lic.favorito) {
                return { label: "Minha", icone: "⭐", className: "bg-amber-500 text-white ring-amber-500/30" };
              }
              if (lic.status_leitura === "vista" || lic.status_leitura === "lida" || lic.status === "em_analise") {
                return { label: "Em Triagem", icone: "⏱️", className: "bg-blue-600 text-white ring-blue-600/30" };
              }
              if (lic.status_leitura === "nova") {
                return { label: "Nova", icone: "✨", className: "bg-primary text-primary-foreground ring-primary/30" };
              }
              return null;
            }}
            renderActions={(lic) => (
              <AtualizacaoActions
                modo="busca"
                onSend={() => handleEnviarLicitacao(lic)}
                onTriagem={() => handleMoverParaTriagem(lic)}
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
