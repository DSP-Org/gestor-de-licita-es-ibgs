import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MODALIDADES as MODALIDADES_API, buscarLicitacoes } from "@/shared/alertaApi";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";
import { escopoUnidade, unidadeEfetiva } from "@/lib/escopoUnidade";
import LicitacoesVisualizacao from "@/components/licitacoes/LicitacoesVisualizacao";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import AtualizacaoActions from "@/components/licitacoes/AtualizacaoActions";
import SeletorListaDialog from "@/components/licitacoes/SeletorListaDialog";
import { toArray } from "@/lib/toArray";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Search, SlidersHorizontal, Trash2, X, ChevronDown, Bell, Sparkles, Loader2, Database } from "lucide-react";
import { combinarLicitacoesVinculos, atualizarVinculoLicitacao } from "@/lib/licitacaoUnidade";

const ESTADOS = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
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

const hojeBR = () =>
  new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

export default function BuscaAvancada() {
  const [filtros, setFiltros] = useState({
    ufs: [],
    municipios: [],
    modalidades: [],
    palavrasChave: [],
    dataAberturaInicio: "",
    dataAberturaFim: "",
    dataPublicacaoInicio: "",
    dataPublicacaoFim: "",
  });
  const [inputPalavraChave, setInputPalavraChave] = useState("");
  const [buscarAPI, setBuscarAPI] = useState(false);
  const [buscarPNCP, setBuscarPNCP] = useState(false);

  const [licitacoes, setLicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [selecionados, setSelecionados] = useState(new Set());
  const [listasFavoritas, setListasFavoritas] = useState([]);
  const [favoritando, setFavoritando] = useState(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("");
  const [mostrarAvancados, setMostrarAvancados] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const { isAdmin, filtroUnidade, usuarioLogado } = useUnidadeFilter();
  const unidadeAtual = unidadeEfetiva(isAdmin, filtroUnidade, usuarioLogado);

  const qtdJaNaUnidade = useMemo(() => licitacoes.filter((l) => l.vinculo_id).length, [licitacoes]);

  // Conta quantos filtros avançados estão ativos pra mostrar no badge do botão.
  const filtrosAvancadosAtivos = useMemo(() => {
    let count = 0;
    if (filtros.dataAberturaInicio || filtros.dataAberturaFim) count++;
    if (filtros.dataPublicacaoInicio || filtros.dataPublicacaoFim) count++;
    if (buscarAPI || buscarPNCP) count++;
    return count;
  }, [filtros.dataAberturaInicio, filtros.dataAberturaFim, filtros.dataPublicacaoInicio, filtros.dataPublicacaoFim, buscarAPI, buscarPNCP]);

  useEffect(() => {
    if (!usuarioLogado) return;
    base44.entities.FavoritaLista
      .filter(escopoUnidade(isAdmin, filtroUnidade), "ordem", 100)
      .then((res) => setListasFavoritas(toArray(res)))
      .catch(() => setListasFavoritas([]));
  }, [isAdmin, filtroUnidade, usuarioLogado]);
  const [municipios, setMunicipios] = useState([]);
  const [buscaMunicipio, setBuscaMunicipio] = useState("");

  const municipiosOrdenados = useMemo(() => {
    const termo = buscaMunicipio.trim().toLowerCase();
    const selecionados = municipios.filter((m) => filtros.municipios.includes(m));
    const naoSelecionados = municipios.filter((m) => !filtros.municipios.includes(m));
    const filtrados = termo
      ? naoSelecionados.filter((m) => m.toLowerCase().includes(termo))
      : naoSelecionados;
    return [...selecionados, ...filtrados];
  }, [municipios, filtros.municipios, buscaMunicipio]);

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
        const dados = await base44.entities.Licitacao.filter({ uf }, "-created_date", 500);
        const lista = toArray(dados);
        lista.forEach(l => { if (l.municipio) allMunicipios.add(l.municipio); });
      }
      setMunicipios(Array.from(allMunicipios).sort());
    } catch (err) {
      console.error("Erro ao carregar municípios:", err);
    }
  }

  async function executarBusca() {
    setCarregando(true);
    setErro("");
    try {
      const [cachesList, licitacoesDb, vinculos] = await Promise.all([
        base44.entities.ConsultaCache.list("-updated_date", 1000),
        base44.entities.Licitacao.list("-updated_date", 2000),
        unidadeAtual
          ? base44.entities.LicitacaoUnidade.filter({ unidade_negocio_id: unidadeAtual }, "-updated_date", 2000)
          : [],
      ]);

      let resultado = combinarLicitacoesVinculos(toArray(licitacoesDb), toArray(vinculos));

      const licitacoesDbMap = new Map();
      for (const l of resultado) {
        if (l.id_licitacao) licitacoesDbMap.set(String(l.id_licitacao), l);
      }

      const poolMap = new Map();
      for (const cache of toArray(cachesList)) {
        for (const l of toArray(cache.resultado?.licitacoes)) {
          if (l?.id_licitacao && !poolMap.has(l.id_licitacao)) poolMap.set(l.id_licitacao, l);
        }
      }
      for (const [id, l] of licitacoesDbMap) {
        if (!poolMap.has(id)) poolMap.set(id, l);
      }

      let resultadoFinal = Array.from(poolMap.values()).map((l) => {
        const doBanco = licitacoesDbMap.get(String(l.id_licitacao));
        return doBanco ? { ...l, ...doBanco } : l;
      });

      resultadoFinal = resultadoFinal.filter((l) => !l.oculto);

      if (filtros.ufs.length > 0) {
        resultado = resultado.filter(l => filtros.ufs.includes(l.uf));
      }
      if (filtros.municipios.length > 0) {
        resultado = resultado.filter(l => filtros.municipios.includes(l.municipio));
      }
      if (filtros.modalidades.length > 0) {
        resultado = resultado.filter(l => filtros.modalidades.includes(l.tipo));
      }
      if (filtros.palavrasChave.length > 0) {
        resultado = resultado.filter(l => {
          const textoCompleto = `${l.titulo || ''} ${l.objeto || ''}`.toLowerCase();
          return filtros.palavrasChave.every(palavra => textoCompleto.includes(palavra.toLowerCase()));
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
      if (filtros.dataPublicacaoInicio) {
        const pubInicio = new Date(filtros.dataPublicacaoInicio + "T00:00:00");
        resultado = resultado.filter(l => {
          if (!l.data_publicacao) return false;
          const dataPub = new Date(l.data_publicacao + "T00:00:00");
          return dataPub >= pubInicio;
        });
      }
      if (filtros.dataPublicacaoFim) {
        const pubFim = new Date(filtros.dataPublicacaoFim + "T23:59:59");
        resultado = resultado.filter(l => {
          if (!l.data_publicacao) return false;
          const dataPub = new Date(l.data_publicacao + "T00:00:00");
          return dataPub <= pubFim;
        });
      }
      if (buscarAPI) {
        try {
          const ufsParaBuscar = filtros.ufs.length > 0 ? filtros.ufs : [undefined];
          const modalidadesCodigos = filtros.modalidades
            .map(modNome => MODALIDADES_API.find(m => m.nome.toLowerCase() === modNome.toLowerCase())?.id)
            .filter(Boolean);
          const modalidadeParaBuscar = modalidadesCodigos.length > 0 ? modalidadesCodigos.join(",") : undefined;
          const palavraChaveParaBuscar = filtros.palavrasChave.length > 0 ? filtros.palavrasChave.join(", ") : undefined;

          const chamadasApi = ufsParaBuscar.map(uf =>
            buscarLicitacoes({
              data_inicio: filtros.dataPublicacaoInicio || undefined,
              data_fim: filtros.dataPublicacaoFim || undefined,
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
            if (res?.error) throw new Error(res.error);
            if (res?.licitacoes) apiLicitacoes.push(...toArray(res.licitacoes));
          }
          if (apiLicitacoes.length > 0) {
            const idsLocais = new Set(resultadoFinal.map(l => l.id_licitacao));
            const novasDaApi = apiLicitacoes.filter(l => !idsLocais.has(l.id_licitacao));
            resultadoFinal = [...resultadoFinal, ...novasDaApi];
          }
        } catch (apiErr) {
          console.error("Erro na busca da API:", apiErr);
          setErro("Aviso: Falha ao buscar na API, mostrando apenas resultados locais. " + apiErr.message);
        }
      }

      if (buscarPNCP) {
        try {
          const ufsParaBuscar = filtros.ufs.length > 0 ? filtros.ufs : [undefined];
          const modalidadesCodigos = filtros.modalidades
            .map(modNome => MODALIDADES_API.find(m => m.nome.toLowerCase() === modNome.toLowerCase())?.id)
            .filter(Boolean);

          if (modalidadesCodigos.length === 0) {
            throw new Error("O PNCP exige ao menos uma modalidade selecionada (Pregão, Concorrência, Leilão, Dispensas ou Chamamento público). Convite e Tomada de Preços não são suportados pelo PNCP.");
          }

          const chamadasPncp = ufsParaBuscar.map(uf =>
            buscarLicitacoes({
              fonte: "pncp",
              data_insercao: filtros.dataPublicacaoInicio || undefined,
              uf: uf || undefined,
              modalidade: modalidadesCodigos.join(","),
              pagina: 1,
              licitacoesPorPagina: 50,
            })
          );
          const respostasPncp = await Promise.all(chamadasPncp);
          const pncpLicitacoes = [];
          for (const res of respostasPncp) {
            if (res?.error) throw new Error(res.error);
            if (res?.licitacoes) pncpLicitacoes.push(...toArray(res.licitacoes));
          }
          if (pncpLicitacoes.length > 0) {
            const idsLocais = new Set(resultadoFinal.map(l => l.id_licitacao));
            const novasDoPncp = pncpLicitacoes.filter(l => !idsLocais.has(l.id_licitacao));
            resultadoFinal = [...resultadoFinal, ...novasDoPncp];
          }
        } catch (pncpErr) {
          console.error("Erro na busca do PNCP:", pncpErr);
          setErro((prevErro) => `${prevErro ? prevErro + " " : ""}Aviso: falha ao buscar no PNCP. ${pncpErr.message}`);
        }
      }

      setLicitacoes(resultadoFinal);
      setUltimaAtualizacao(hojeBR());
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
      dataPublicacaoInicio: "",
      dataPublicacaoFim: "",
    });
    setInputPalavraChave("");
    setBuscarAPI(false);
    setBuscarPNCP(false);
    setLicitacoes([]);
    setSelecionados(new Set());
    setErro("");
    setUltimaAtualizacao("");
  }

  function toggleUF(uf) {
    setFiltros(prev => {
      const novasUFs = prev.ufs.includes(uf) ? prev.ufs.filter(u => u !== uf) : [...prev.ufs, uf];
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
      setFiltros(prev => ({ ...prev, palavrasChave: [...prev.palavrasChave, inputPalavraChave.trim()] }));
      setInputPalavraChave("");
    }
  }

  function removerPalavraChave(palavra) {
    setFiltros(prev => ({ ...prev, palavrasChave: prev.palavrasChave.filter(p => p !== palavra) }));
  }

  function handleMudarFiltro(campo, valor) {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  }

  async function garantirNaUnidade(licacao, camposExtra = {}) {
    let global = licacao;
    if (!licacao.id) {
      const resposta = await base44.functions.invoke("salvarLicitacaoNoBanco", licacao);
      global = { ...licacao, ...resposta.data?.licitacao };
    }
    await atualizarVinculoLicitacao(global, unidadeAtual, { oculto: false, ...camposExtra });
    return global;
  }

  async function handleDelete(licacao) {
    if (!confirm("Descartar esta licitação? Ela sai da sua lista, mas continua no banco.")) return;
    try {
      await garantirNaUnidade(licacao, { oculto: true });
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

  async function handleMoverParaTriagem(licacao) {
    try {
      const global = await garantirNaUnidade(licacao, { status_leitura: "vista" });
      setLicitacoes((prev) =>
        prev.map((l) =>
          l.id_licitacao === licacao.id_licitacao
            ? { ...l, ...global, status_leitura: "vista" }
            : l
        )
      );
      alert("Licitação enviada para Em Triagem!");
    } catch (err) {
      console.error("Erro ao mover para triagem:", err);
      alert("Erro ao enviar para triagem: " + err.message);
    }
  }

  const handleFavoritarLicitacao = (licacao) => setFavoritando([licacao]);

  const criarListaFavorita = async (nome) => {
    const nova = await base44.entities.FavoritaLista.create({
      nome,
      ordem: listasFavoritas.length,
      unidade_negocio_id: unidadeEfetiva(isAdmin, filtroUnidade, usuarioLogado),
    });
    setListasFavoritas((prev) => [...prev, nova]);
    return nova;
  };

  const confirmarFavoritar = async (listaId) => {
    const campos = { favorito: true, oculto: false, lista_favorita_id: listaId || "" };
    const registradas = await Promise.all(favoritando.map((l) => garantirNaUnidade(l, campos)));
    const idsOriginais = new Set(favoritando.map((f) => f.id_licitacao));
    setLicitacoes((prev) =>
      prev.map((l) => {
        if (!idsOriginais.has(l.id_licitacao)) return l;
        const registrada = registradas.find((r) => r.id_licitacao === l.id_licitacao);
        return { ...l, ...registrada, ...campos };
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

  const totalFiltrosAtivos =
    filtros.ufs.length + filtros.modalidades.length + filtros.palavrasChave.length +
    (filtros.dataAberturaInicio ? 1 : 0) + (filtros.dataAberturaFim ? 1 : 0) +
    (filtros.dataPublicacaoInicio ? 1 : 0) + (filtros.dataPublicacaoFim ? 1 : 0) +
    (buscarAPI ? 1 : 0) + (buscarPNCP ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ===== HERO ===== */}
        <div className="mb-8 sm:mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-2">
            Radar de Oportunidades
          </p>
          <h1 className="font-heading text-2xl sm:text-4xl font-bold text-foreground leading-tight mb-2">
            Encontre a próxima conquista.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Pesquise em fontes públicas e privadas sem alternar entre portais. Compare, salve e avance com contexto.
          </p>
        </div>

        {/* ===== BARRA DE BUSCA INLINE ===== */}
        <div className="bg-white dark:bg-card border border-border rounded-2xl shadow-sm p-3 sm:p-4 mb-4">
          {/* Linha 1: busca por texto + palavra-chave */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Busque por palavra-chave, órgão ou categoria..."
                value={inputPalavraChave}
                onChange={(e) => setInputPalavraChave(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adicionarPalavraChave()}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            {inputPalavraChave.trim() && (
              <button
                onClick={adicionarPalavraChave}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium border rounded-lg hover:bg-muted shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" /> Adicionar termo
              </button>
            )}
          </div>

          {/* Tags de palavras-chave ativas */}
          {filtros.palavrasChave.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {filtros.palavrasChave.map(palavra => (
                <span key={palavra} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  {palavra}
                  <button onClick={() => removerPalavraChave(palavra)} className="hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Linha 2: filtros rápidos em dropdowns */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/60">
            {/* Estados */}
            <DropdownFilter
              label="Estados"
              badge={filtros.ufs.length}
              summary={filtros.ufs.length === 0 ? "Todos os estados" : `${filtros.ufs.length} selecionado(s)`}
            >
              <div className="min-w-72">
                <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-border/60 mb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {filtros.ufs.length} de {ESTADOS.length} selecionados
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFiltros(prev => ({ ...prev, ufs: ESTADOS.map(e => e.uf), municipios: [] }))}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltros(prev => ({ ...prev, ufs: [], municipios: [] }))}
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 max-h-64 overflow-y-auto p-0.5">
                  {ESTADOS.map(({ uf, nome }) => {
                    const ativo = filtros.ufs.includes(uf);
                    return (
                      <button
                        key={uf}
                        type="button"
                        onClick={() => toggleUF(uf)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${
                          ativo ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <span className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${ativo ? "bg-primary border-primary" : "border-border"}`}>
                          {ativo && <span className="w-2 h-2 rounded-[1px] bg-primary-foreground" />}
                        </span>
                        <span className="font-mono font-bold text-[11px] w-6">{uf}</span>
                        <span className="truncate">{nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </DropdownFilter>

            {/* Modalidades */}
            <DropdownFilter
              label="Modalidades"
              badge={filtros.modalidades.length}
              summary={filtros.modalidades.length === 0 ? "Modalidades" : `${filtros.modalidades.length} selecionada(s)`}
            >
              <div className="space-y-1 max-h-56 overflow-y-auto p-1">
                {MODALIDADES.map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted text-xs">
                    <input type="checkbox" checked={filtros.modalidades.includes(m)} onChange={() => toggleModalidade(m)} className="w-3.5 h-3.5 rounded" />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
            </DropdownFilter>

            {/* Fontes */}
            <DropdownFilter
              label="Fontes"
              badge={(buscarAPI ? 1 : 0) + (buscarPNCP ? 1 : 0)}
              summary={(!buscarAPI && !buscarPNCP) ? "Todas as fontes" : `${[buscarAPI && "Alerta Licitação", buscarPNCP && "PNCP"].filter(Boolean).join(" + ")}`}
            >
              <div className="space-y-2 p-1 min-w-56">
                <label className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted text-xs">
                  <input type="checkbox" checked={buscarAPI} onChange={(e) => setBuscarAPI(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                  <span>API (alertalicitacao.com.br)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted text-xs">
                  <input type="checkbox" checked={buscarPNCP} onChange={(e) => setBuscarPNCP(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                  <span>PNCP (Portal Nacional)</span>
                </label>
              </div>
            </DropdownFilter>

            {/* Botão filtros avançados */}
            <button
              onClick={() => setMostrarAvancados(!mostrarAvancados)}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
                mostrarAvancados || filtrosAvancadosAtivos > 0
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Avançado</span>
              {filtrosAvancadosAtivos > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">{filtrosAvancadosAtivos}</span>
              )}
            </button>

            <div className="hidden sm:block sm:flex-1" />

            {/* Limpar */}
            {totalFiltrosAtivos > 0 && (
              <button
                onClick={limparFiltros}
                className="inline-flex min-h-11 items-center justify-center gap-1 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </button>
            )}

            {/* Buscar */}
            <button
              onClick={executarBusca}
              disabled={carregando}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 shrink-0"
            >
              {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="hidden sm:inline">{carregando ? "Buscando..." : "Buscar"}</span>
            </button>
          </div>

          {/* Filtros avançados recolhíveis */}
          {mostrarAvancados && (
            <div className="mt-3 pt-3 border-t border-border/60 space-y-4">
              {/* Município */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Município {filtros.ufs.length > 1 && <span className="text-destructive">(apenas 1 UF)</span>}</p>
                {filtros.ufs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Selecione um estado para ver os municípios</p>
                ) : filtros.ufs.length > 1 ? (
                  <p className="text-xs text-destructive">Selecione apenas um estado para filtrar por município.</p>
                ) : (
                  <>
                    <input
                      type="text"
                      value={buscaMunicipio}
                      onChange={(e) => setBuscaMunicipio(e.target.value)}
                      placeholder="Filtrar municípios..."
                      className="w-full px-3 py-2 mb-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto border border-border/60 rounded-lg p-2.5">
                      {municipiosOrdenados.length === 0 ? (
                        <p className="text-xs text-muted-foreground col-span-full">Nenhum município encontrado.</p>
                      ) : (
                        municipiosOrdenados.map(m => (
                          <label key={m} className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input type="checkbox" checked={filtros.municipios.includes(m)} onChange={() => toggleMunicipio(m)} className="w-3.5 h-3.5 rounded" />
                            <span className={filtros.municipios.includes(m) ? "font-semibold text-primary" : ""}>{m}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Datas de abertura */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Abertura - Início</label>
                  <input type="date" value={filtros.dataAberturaInicio} onChange={(e) => handleMudarFiltro("dataAberturaInicio", e.target.value)} className="w-full px-2.5 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Abertura - Fim</label>
                  <input type="date" value={filtros.dataAberturaFim} onChange={(e) => handleMudarFiltro("dataAberturaFim", e.target.value)} className="w-full px-2.5 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>

              {/* Datas de publicação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Publicação - Início</label>
                  <input type="date" value={filtros.dataPublicacaoInicio} onChange={(e) => handleMudarFiltro("dataPublicacaoInicio", e.target.value)} className="w-full px-2.5 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Publicação - Fim</label>
                  <input type="date" value={filtros.dataPublicacaoFim} onChange={(e) => handleMudarFiltro("dataPublicacaoFim", e.target.value)} className="w-full px-2.5 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>


            </div>
          )}
        </div>

        {/* ===== BARRA DE STATUS ===== */}
        {(licitacoes.length > 0 || carregando) && (
          <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
            {carregando ? (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando oportunidades...
              </span>
            ) : (
              <>
                <span className="font-bold text-foreground">
                  {licitacoes.length} oportunidade{licitacoes.length !== 1 ? "s" : ""} encontrada{licitacoes.length !== 1 ? "s" : ""}
                </span>
                {ultimaAtualizacao && (
                  <span className="text-muted-foreground text-xs">· Última atualização {ultimaAtualizacao}</span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                  {qtdJaNaUnidade} já na sua unidade
                </span>
                {(licitacoes.length - qtdJaNaUnidade) > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                    {licitacoes.length - qtdJaNaUnidade} só no banco do sistema
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {erro && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{erro}</div>
        )}

        {/* ===== RESULTADOS ===== */}
        {licitacoes.length > 0 && (
          <LicitacoesVisualizacao
            licitacoes={licitacoes}
            loading={carregando}
            vazio={licitacoes.length === 0}
            onRowClick={setSelecionada}
            selecionados={selecionados}
            onToggleSelecao={handleToggleSelecao}
            tagEstado={(lic) => {
              if (!lic.id) return null;
              if (lic.favorito) return { label: "Minha", icone: "⭐", className: "bg-status-amber text-status-amber-foreground ring-status-amber/30" };
              if (lic.status_leitura === "vista" || lic.status_leitura === "lida" || lic.status === "em_analise") {
                return { label: "Em Triagem", icone: "⏱️", className: "bg-status-blue text-status-blue-foreground ring-status-blue/30" };
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
          <div className="text-center py-16 sm:py-24">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Pronto para buscar</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Configure os filtros acima e clique em <strong>Buscar</strong> para explorar oportunidades em todas as fontes disponíveis.
            </p>
          </div>
        )}
      </div>

      {selecionada && (
        <LicitacaoDetailDialog
          licitacao={selecionada}
          onClose={() => setSelecionada(null)}
          onFavoritar={handleFavoritarLicitacao}
        />
      )}

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

// Dropdown de filtro reutilizável — abre ao clicar, fecha ao clicar fora.
function DropdownFilter({ label, badge, summary, children }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        onClick={() => setAberto(!aberto)}
        className={`inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
          badge > 0
            ? "border-primary text-primary bg-primary/5"
            : "border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        <span className="truncate max-w-32">{badge > 0 ? summary : label}</span>
        {badge > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">{badge}</span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-auto bg-white dark:bg-card border-t border-border rounded-t-2xl shadow-2xl p-3 sm:absolute sm:inset-auto sm:mt-1 sm:max-h-none sm:overflow-visible sm:left-0 sm:rounded-lg sm:border sm:p-1 sm:min-w-56">
          {children}
        </div>
      )}
    </div>
  );
}