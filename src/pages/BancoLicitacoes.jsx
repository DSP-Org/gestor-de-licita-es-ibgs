import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";
import { escopoUnidade, unidadeEfetiva, pertenceAUnidade } from "@/lib/escopoUnidade";
import {
  Search, Star, Check, Loader2, Database, ChevronLeft, ChevronRight,
  FileDown, Sheet, Mail, Zap, AlertCircle, Sparkles, Trash2, Clock, Undo2,
} from "lucide-react";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import EmailResultsDialog from "@/components/licitacoes/EmailResultsDialog";
import AtualizacaoActions from "@/components/licitacoes/AtualizacaoActions";
import AtualizacaoBulkActions from "@/components/licitacoes/AtualizacaoBulkActions";
import LicitacoesVisualizacao from "@/components/licitacoes/LicitacoesVisualizacao";
import GestaoRapida from "@/components/licitacoes/GestaoRapida";
import SeletorListaDialog from "@/components/licitacoes/SeletorListaDialog";
import BuscaMultiSelect from "@/components/buscas/BuscaMultiSelect";
import FiltrosGeograficos from "@/components/licitacoes/FiltrosGeograficos";
import FavoritasTab from "@/components/licitacoes/FavoritasTab";
import { toArray } from "@/lib/toArray";
import { exportarLicitacoesPDF } from "@/lib/exportarLicitacoesPDF";
import { exportarLicitacoesExcel } from "@/lib/exportarLicitacoesExcel";
import { calcularUrgenciaAbertura } from "@/lib/prazosLicitacao";
import { resolverEstadoLicitacao } from "@/lib/licitacaoCicloVida";

const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export const combinaComPalavraChave = (l, palavraChave, modoPalavras) => {
  const termos = (palavraChave || "").split(",").map((t) => t.trim()).filter(Boolean);
  if (termos.length === 0) return true;
  const texto = `${l.titulo || ""} ${l.objeto || ""}`.toLowerCase();
  const positivos = [];
  const negativos = [];
  termos.forEach((termo) => {
    const negativo = termo.startsWith("-");
    const limpo = (negativo ? termo.slice(1) : termo).replace(/^"|"$/g, "").trim().toLowerCase();
    if (!limpo) return;
    (negativo ? negativos : positivos).push(limpo);
  });
  if (negativos.some((n) => texto.includes(n))) return false;
  if (positivos.length === 0) return true;
  return modoPalavras === "todas" ? positivos.every((p) => texto.includes(p)) : positivos.some((p) => texto.includes(p));
};

// Converte uma busca salva no formato unificado de validação de filtros.
export const filtrosDaBusca = (b) => ({
  ufs: (b.uf || "").split(",").map((s) => s.trim()).filter(Boolean),
  modalidades: (b.modalidade || "").split(",").map((s) => s.trim()).filter(Boolean),
  municipioIbge: b.municipio_ibge || "",
  palavraChave: b.palavra_chave || "",
  modoPalavras: b.modo_palavras || "qualquer",
});

export const combinaComFiltros = (l, f) => {
  if (f.ufs.length && !f.ufs.includes(l.uf)) return false;
  if (f.modalidades.length && !f.modalidades.includes(String(l.id_tipo))) return false;
  if (f.municipioIbge && l.municipio_IBGE !== f.municipioIbge) return false;
  return combinaComPalavraChave(l, f.palavraChave, f.modoPalavras);
};

export default function BancoLicitacoes() {
  const [aba, setAba] = useState("novas");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState(null);
  const { isAdmin, filtroUnidade, usuarioLogado } = useUnidadeFilter();

  // ---------- Aba "Novas" (sincronização automática) ----------
  const [novas, setNovas] = useState([]);
  const [novasLoading, setNovasLoading] = useState(true);

  // ---------- Aba "Em Triagem / Analisar" ----------
  const [triagem, setTriagem] = useState([]);
  const [triagemLoading, setTriagemLoading] = useState(false);
  const [selecionadasTriagem, setSelecionadasTriagem] = useState(new Set());

  // ---------- Aba "Descartadas" ----------
  const [descartadas, setDescartadas] = useState([]);
  const [descartadasLoading, setDescartadasLoading] = useState(false);
  const [selecionadasDescartadas, setSelecionadasDescartadas] = useState(new Set());

  // ---------- Aba "Selecionadas" (favoritadas) ----------
  const [selecionadas, setSelecionadas] = useState([]);
  const [selecionadasLoading, setSelecionadasLoading] = useState(false);
  const [selecionadasSelecionadas, setSelecionadasSelecionadas] = useState(new Set());

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState(null);
  const [buscasSalvas, setBuscasSalvas] = useState([]);
  const [buscasSelecionadas, setBuscasSelecionadas] = useState([]);
  const [compartilhar, setCompartilhar] = useState(null);
  const [selecionadasNovas, setSelecionadasNovas] = useState(new Set());
  const [filtroOrigem, setFiltroOrigem] = useState(null);
  const [filtroUF, setFiltroUF] = useState("todos");
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos");
  const [filtroModalidade, setFiltroModalidade] = useState("todos");
  // Carregadas uma vez e compartilhadas por todos os cards, para o seletor de
  // lista não disparar uma consulta por licitação.
  const [listasFavoritas, setListasFavoritas] = useState([]);
  // { modo: "atualizar" | "criar", itens: [...] } enquanto o seletor de lista está aberto.
  const [favoritando, setFavoritando] = useState(null);

  // Carrega oportunidades ativas (não favoritadas e não descartadas) e particiona:
  // - Novas: sincronizadas há até 3 dias e status_leitura === "nova"
  // - Em Triagem: sincronizadas há mais de 3 dias OU já visualizadas/lidas/em_analise
  const carregarAtivas = async () => {
    setNovasLoading(true);
    setTriagemLoading(true);
    try {
      const filtro = { oculto: { $ne: true }, favorito: { $ne: true }, ...escopoUnidade(isAdmin, filtroUnidade) };

      const [lista, cachesList, buscasList] = await Promise.all([
        base44.entities.Licitacao.filter(
          filtro,
          "-created_date",
          200
        ),
        // Banco global consolidado: de onde vêm as licitações que casam com as
        // buscas da unidade mas ainda não foram materializadas como Licitacao.
        base44.entities.ConsultaCache.list("-updated_date", 100),
        // Buscas ativas da unidade: necessárias pra saber quais critérios usar
        // ao trazer licitações do cache que ainda não estão no banco.
        base44.entities.BuscaSalva.filter(
          escopoUnidade(isAdmin, filtroUnidade),
          "nome",
          100
        ),
      ]);

      const listaArray = toArray(lista);
      const idsNoBanco = new Set(listaArray.map((l) => l.id_licitacao));

      // Critérios das buscas ativas da unidade — uma licitação do cache entra
      // no funil se casar com pelo menos uma delas e ainda estiver em aberto.
      const buscasAtivas = toArray(buscasList).filter((b) => b.ativa !== false);
      const filtrosAtivas = buscasAtivas.map(filtrosDaBusca);

      const cacheNovas = [];
      if (filtrosAtivas.length > 0) {
        const cacheMap = new Map();
        for (const cache of toArray(cachesList)) {
          const lics = toArray(cache.resultado?.licitacoes);
          for (const l of lics) {
            if (l?.id_licitacao && !cacheMap.has(l.id_licitacao)) {
              cacheMap.set(l.id_licitacao, l);
            }
          }
        }
        for (const l of cacheMap.values()) {
          if (idsNoBanco.has(l.id_licitacao)) continue;
          if (!filtrosAtivas.some((f) => combinaComFiltros(l, f))) continue;
          // Só entra quem ainda está em aberto (abertura hoje ou no futuro).
          const urg = calcularUrgenciaAbertura(l.abertura_datetime, l.abertura);
          if (urg.tipo === "encerrada" || urg.tipo === "sem_data") continue;
          cacheNovas.push(l);
        }
      }

      const arrNovas = [];
      const arrTriagem = [];
      for (const item of listaArray) {
        if (resolverEstadoLicitacao(item) === "novas") {
          arrNovas.push(item);
        } else {
          arrTriagem.push(item);
        }
      }
      arrNovas.push(...cacheNovas);

      setNovas(arrNovas);
      setTriagem(arrTriagem);
    } finally {
      setNovasLoading(false);
      setTriagemLoading(false);
    }
  };

  const carregarDescartadas = async () => {
    setDescartadasLoading(true);
    try {
      // Itens descartados / ocultos
      const filtro = {
        oculto: true,
        ...escopoUnidade(isAdmin, filtroUnidade),
      };
      const lista = await base44.entities.Licitacao.filter(filtro, "-updated_date", 500);
      setDescartadas(toArray(lista));
    } finally {
      setDescartadasLoading(false);
    }
  };

  const carregarSelecionadas = async () => {
    setSelecionadasLoading(true);
    try {
      const filtro = { favorito: true, oculto: { $ne: true }, ...escopoUnidade(isAdmin, filtroUnidade) };
      const lista = await base44.entities.Licitacao.filter(filtro, "-updated_date", 500);
      setSelecionadas(toArray(lista));
    } finally {
      setSelecionadasLoading(false);
    }
  };

  const carregarTudo = () => {
    carregarAtivas();
    carregarDescartadas();
    carregarSelecionadas();
  };

  const marcarLeitura = async (licId, novoStatus) => {
    try {
      await base44.entities.Licitacao.update(licId, { status_leitura: novoStatus });
      carregarAtivas();
    } catch (e) {
      console.error("Erro ao marcar leitura:", e);
    }
  };

  useEffect(() => {
    if (!usuarioLogado) return;
    carregarAtivas();
    carregarDescartadas();
    carregarSelecionadas();

    const filtroBuscas = escopoUnidade(isAdmin, filtroUnidade);

    base44.entities.BuscaSalva.filter(filtroBuscas, "nome", 100).then((res) => {
      const lista = toArray(res).filter((b) => b.ativa !== false);
      setBuscasSalvas(lista);
      setBuscasSelecionadas(lista.map((item) => item.id));
    });

    base44.entities.FavoritaLista
      .filter(escopoUnidade(isAdmin, filtroUnidade), "ordem", 100)
      .then((res) => setListasFavoritas(toArray(res).sort((a, b) => (a.ordem || 0) - (b.ordem || 0))))
      .catch(() => setListasFavoritas([]));
  }, [filtroUnidade, isAdmin, usuarioLogado]);

  const buscasFiltradas = useMemo(
    () => buscasSalvas.filter((b) => pertenceAUnidade(b, filtroUnidade)),
    [buscasSalvas, filtroUnidade],
  );

  const filtrosDasBuscasAtivas = useMemo(
    () => buscasFiltradas.map(filtrosDaBusca),
    [buscasFiltradas],
  );

  useEffect(() => {
    setBuscasSelecionadas(buscasFiltradas.map((b) => b.id));
  }, [buscasFiltradas]);

  const nomesBuscasAtivas = useMemo(
    () => new Set(buscasFiltradas.map((b) => b.nome?.trim().toLowerCase()).filter(Boolean)),
    [buscasFiltradas]
  );

  const todasBuscasSelecionadas = buscasFiltradas.length > 0 && buscasSelecionadas.length === buscasFiltradas.length;

  const filtrarLista = (lista) => {
    // Se não há buscas ativas configuradas para esta unidade, as abas de funil ficam vazias
    // para indicar a necessidade de configurar as buscas.
    if (buscasFiltradas.length === 0) return [];

    const agora = new Date();
    const hojeZeroHora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    // Se o usuário selecionou uma busca específica no seletor, filtra exatamente por ela
    const buscaAtivaSelecionada = !todasBuscasSelecionadas && buscasSelecionadas.length === 1
      ? buscasFiltradas.find((b) => b.id === buscasSelecionadas[0])
      : null;
    const filtroBuscaEspecifica = buscaAtivaSelecionada ? filtrosDaBusca(buscaAtivaSelecionada) : null;
    const nomeBuscaEspecifica = buscaAtivaSelecionada?.nome?.trim().toLowerCase() || null;

    return lista.filter((l) => {
      // Itens do cache global (sem unidade_negocio_id) já foram pré-filtrados
      // pelos critérios das buscas ativas em carregarAtivas — não passam pelo
      // filtro de unidade porque não pertencem a uma unidade específica.
      if (l.unidade_negocio_id && !pertenceAUnidade(l, filtroUnidade)) return false;
      if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
      if (filtroUF !== "todos" && l.uf !== filtroUF) return false;
      if (filtroMunicipio !== "todos" && l.municipio !== filtroMunicipio) return false;
      if (filtroModalidade !== "todos" && l.tipo !== filtroModalidade) return false;
      if (filtroOrigem && (l.busca_origem || "Sem origem") !== filtroOrigem) return false;

      // Se uma busca específica estiver marcada no seletor, a licitação só aparece se atender a ela
      if (buscaAtivaSelecionada) {
        const bateNome = l.busca_origem && l.busca_origem.trim().toLowerCase() === nomeBuscaEspecifica;
        const bateCriterio = combinaComFiltros(l, filtroBuscaEspecifica);
        if (!bateNome && !bateCriterio) return false;
      } else {
        // Se "Todas as buscas ativas" estiver selecionado:
        const origemBate = l.busca_origem && nomesBuscasAtivas.has(l.busca_origem.trim().toLowerCase());
        const criterioBate = filtrosDasBuscasAtivas.some((f) => combinaComFiltros(l, f));
        if (!origemBate && !criterioBate) return false;
      }

      if (busca) {
        const q = busca.toLowerCase();
        const txt = `${l.titulo} ${l.objeto} ${l.orgao} ${l.municipio} ${l.uf} ${l.id_licitacao} ${l.busca_origem || ""}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  };

  const novasFiltradas = useMemo(
    () => filtrarLista(novas),
    [novas, filtroStatus, busca, filtroUnidade, filtroOrigem, aba, filtrosDasBuscasAtivas, nomesBuscasAtivas, buscasFiltradas, buscasSelecionadas, todasBuscasSelecionadas, filtroUF, filtroMunicipio, filtroModalidade]
  );
  const triagemFiltradas = useMemo(
    () => filtrarLista(triagem),
    [triagem, filtroStatus, busca, filtroUnidade, filtroOrigem, aba, filtrosDasBuscasAtivas, nomesBuscasAtivas, buscasFiltradas, buscasSelecionadas, todasBuscasSelecionadas, filtroUF, filtroMunicipio, filtroModalidade]
  );
  const descartadasFiltradas = useMemo(
    () => filtrarLista(descartadas),
    [descartadas, filtroStatus, busca, filtroUnidade, filtroOrigem, aba, filtrosDasBuscasAtivas, nomesBuscasAtivas, buscasFiltradas, buscasSelecionadas, todasBuscasSelecionadas, filtroUF, filtroMunicipio, filtroModalidade]
  );

  // Filtro da aba "Selecionadas" — não depende de buscas ativas, só dos filtros
  // geográficos e do termo de busca, porque favoritadas são um recorte do usuário.
  const selecionadasFiltradas = useMemo(() => {
    return selecionadas.filter((l) => {
      if (filtroUF !== "todos" && l.uf !== filtroUF) return false;
      if (filtroMunicipio !== "todos" && l.municipio !== filtroMunicipio) return false;
      if (filtroModalidade !== "todos" && l.tipo !== filtroModalidade) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const txt = `${l.titulo} ${l.objeto} ${l.orgao} ${l.municipio} ${l.uf} ${l.id_licitacao}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [selecionadas, busca, filtroUF, filtroMunicipio, filtroModalidade]);

  // Opções de UF, município e modalidade derivadas de todas as licitações carregadas
  const ufsDisponiveis = useMemo(() => {
    const set = new Set();
    [...novas, ...triagem, ...descartadas, ...selecionadas].forEach((l) => { if (l.uf) set.add(l.uf); });
    return Array.from(set).sort();
  }, [novas, triagem, descartadas, selecionadas]);

  const municipiosDisponiveis = useMemo(() => {
    const set = new Set();
    [...novas, ...triagem, ...descartadas, ...selecionadas].forEach((l) => {
      if (l.municipio && (!filtroUF || filtroUF === "todos" || l.uf === filtroUF)) set.add(l.municipio);
    });
    return Array.from(set).sort();
  }, [novas, triagem, descartadas, selecionadas, filtroUF]);

  const modalidadesDisponiveis = useMemo(() => {
    const set = new Set();
    [...novas, ...triagem, ...descartadas, ...selecionadas].forEach((l) => { if (l.tipo) set.add(l.tipo); });
    return Array.from(set).sort();
  }, [novas, triagem, descartadas, selecionadas]);

  // Contagem por origem. Respeita unidade, critérios de buscas ativas, status e termo de busca,
  // mas de propósito ignora o próprio filtro de origem: se o considerasse, escolher uma
  // origem zeraria as demais e não haveria como trocar de seleção.
  const porBuscaOrigem = useMemo(() => {
    if (buscasFiltradas.length === 0) return {};

    const agora = new Date();
    const hojeZeroHora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const grupos = {};
    novas
      .filter((l) => {
        if (!pertenceAUnidade(l, filtroUnidade)) return false;
        if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
        const origemBate = l.busca_origem && nomesBuscasAtivas.has(l.busca_origem.trim().toLowerCase());
        const criterioBate = filtrosDasBuscasAtivas.some((f) => combinaComFiltros(l, f));
        if (!origemBate && !criterioBate) return false;

        if (busca) {
          const q = busca.toLowerCase();
          const txt = `${l.titulo} ${l.objeto} ${l.orgao} ${l.municipio} ${l.uf} ${l.id_licitacao} ${l.busca_origem || ""}`.toLowerCase();
          if (!txt.includes(q)) return false;
        }
        return true;
      })
      .forEach((l) => {
        const key = l.busca_origem || "Sem origem";
        grupos[key] = (grupos[key] || 0) + 1;
      });
    return grupos;
  }, [novas, filtroUnidade, filtroStatus, busca, filtrosDasBuscasAtivas, nomesBuscasAtivas, buscasFiltradas]);

  const sincronizarAgora = async () => {
    setSincronizando(true);
    setResultadoSync(null);
    try {
      const res = await base44.functions.invoke("sincronizarBuscas", { buscaIds: buscasSelecionadas });
      setResultadoSync(res.data || res);
      carregarAtivas();
    } catch (e) {
      setResultadoSync({ error: e.message });
    } finally {
      setSincronizando(false);
    }
  };

  const handleSaveNova = async (dados) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = dados;
    if (selecionada?.id) {
      await base44.entities.Licitacao.update(selecionada.id, rest);
    }
    setSelecionada(null);
    carregarAtivas();
  };

  // Favoritar abre o seletor de lista; a gravação acontece em confirmarFavoritar.
  const handleSaveManual = (licitacao) => setFavoritando({ modo: "atualizar", itens: [licitacao] });

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
    const { modo, itens } = favoritando;
    const campos = { favorito: true, salva_manualmente: true, lista_favorita_id: listaId || "" };

    if (modo === "criar") {
      // Vindas do acervo (ConsultaCache), ainda não existem como Licitacao.
      // unidade_negocio_id: com uma unidade escolhida no seletor, a licitação nasce dela.
      await base44.entities.Licitacao.bulkCreate(
        itens.map((lic) => ({
          unidade_negocio_id: unidadeEfetiva(isAdmin, filtroUnidade, usuarioLogado),
          id_licitacao: lic.id_licitacao,
          titulo: lic.titulo,
          objeto: lic.objeto,
          uf: lic.uf,
          municipio: lic.municipio,
          municipio_ibge: lic.municipio_IBGE,
          orgao: lic.orgao,
          abertura_datetime: lic.abertura_datetime,
          abertura: lic.abertura,
          tipo: lic.tipo,
          id_tipo: lic.id_tipo,
          valor: lic.valor,
          link: lic.link,
          link_externo: lic.linkExterno,
          status: "interessado",
          data_sincronizacao: hojeISO(),
          ...campos,
        })),
      );
      setSalvasIds((prev) => new Set([...prev, ...itens.map((l) => l.id_licitacao)]));
      // Alimenta o banco global compartilhado, economizando consultas futuras.
      itens.forEach((lic) => base44.functions.invoke("salvarLicitacaoNoBanco", lic).catch(() => {}));
    } else {
      await base44.entities.Licitacao.bulkUpdate(itens.map((l) => ({ id: l.id, ...campos })));
      setNovas((prev) => prev.filter((n) => !itens.some((i) => i.id === n.id)));
      setSelecionadasNovas(new Set());
    }
    setFavoritando(null);
  };

  // Mover para Em Triagem (status_leitura: "vista", status: "em_analise")
  const handleMoverParaTriagem = async (licitacao) => {
    try {
      await base44.entities.Licitacao.update(licitacao.id, {
        status_leitura: "vista",
        status: "em_analise",
      });
      // Atualiza os arrays locais imediatamente
      setNovas((prev) => prev.filter((l) => l.id !== licitacao.id));
      setTriagem((prev) => [{ ...licitacao, status_leitura: "vista", status: "em_analise" }, ...prev]);
      setSelecionadasNovas((prev) => {
        const next = new Set(prev);
        next.delete(licitacao.id_licitacao);
        return next;
      });
    } catch (e) {
      console.error("Erro ao mover para triagem:", e);
    }
  };

  // Restaurar de Descartadas de volta para Novas
  const handleRestaurar = async (licitacao) => {
    try {
      await base44.entities.Licitacao.update(licitacao.id, {
        oculto: false,
        status_leitura: "nova",
        status: "interessado",
      });
      // Atualiza os arrays locais imediatamente
      setDescartadas((prev) => prev.filter((l) => l.id !== licitacao.id));
      setNovas((prev) => [{ ...licitacao, oculto: false, status_leitura: "nova", status: "interessado" }, ...prev]);
      setSelecionadasDescartadas((prev) => {
        const next = new Set(prev);
        next.delete(licitacao.id_licitacao);
        return next;
      });
    } catch (e) {
      console.error("Erro ao restaurar licitação:", e);
    }
  };

  // Descartar (ocultar) de Novas ou de Triagem
  const handleDeleteItem = async (licitacao) => {
    if (!window.confirm(`Descartar "${licitacao.titulo}"? Ela irá para a aba Descartadas.`)) return;
    try {
      await base44.entities.Licitacao.update(licitacao.id, { oculto: true });
      setNovas((prev) => prev.filter((l) => l.id !== licitacao.id));
      setTriagem((prev) => prev.filter((l) => l.id !== licitacao.id));
      setSelecionadas((prev) => prev.filter((l) => l.id !== licitacao.id));
      setDescartadas((prev) => [{ ...licitacao, oculto: true }, ...prev]);
      setSelecionadasNovas((prev) => {
        const next = new Set(prev);
        next.delete(licitacao.id_licitacao);
        return next;
      });
      setSelecionadasTriagem((prev) => {
        const next = new Set(prev);
        next.delete(licitacao.id_licitacao);
        return next;
      });
    } catch (e) {
      console.error("Erro ao descartar licitação:", e);
    }
  };

  const excluirDefinitivamente = async (licitacao) => {
    if (!isAdmin) return;
    if (!window.confirm(`Excluir "${licitacao.titulo}" DEFINITIVAMENTE do banco? Esta ação não pode ser desfeita.`)) return;
    try {
      await base44.entities.Licitacao.delete(licitacao.id);
      setNovas((prev) => prev.filter((l) => l.id !== licitacao.id));
      setTriagem((prev) => prev.filter((l) => l.id !== licitacao.id));
      setDescartadas((prev) => prev.filter((l) => l.id !== licitacao.id));
      setSelecionadas((prev) => prev.filter((l) => l.id !== licitacao.id));
    } catch (e) {
      console.error("Erro ao excluir do banco:", e);
    }
  };

  const toggleSelecao = (setFunc) => (idLicitacao, marcada) => {
    setFunc((prev) => {
      const nova = new Set(prev);
      marcada ? nova.add(idLicitacao) : nova.delete(idLicitacao);
      return nova;
    });
  };

  const toggleSelecaoNova = toggleSelecao(setSelecionadasNovas);
  const toggleSelecaoTriagem = toggleSelecao(setSelecionadasTriagem);
  const toggleSelecaoDescartadas = toggleSelecao(setSelecionadasDescartadas);

  const itensSelecionadosNovas = () => novas.filter((item) => selecionadasNovas.has(item.id_licitacao));
  const itensSelecionadosTriagem = () => triagem.filter((item) => selecionadasTriagem.has(item.id_licitacao));
  const itensSelecionadosDescartadas = () => descartadas.filter((item) => selecionadasDescartadas.has(item.id_licitacao));

  const excluirSelecionadasNovas = async () => {
    if (!window.confirm(`Descartar ${selecionadasNovas.size} licitação(ões)? Elas irão para a aba Descartadas.`)) return;
    const itens = itensSelecionadosNovas();
    await base44.entities.Licitacao.bulkUpdate(itens.map((item) => ({ id: item.id, oculto: true })));
    setNovas((prev) => prev.filter((item) => !selecionadasNovas.has(item.id_licitacao)));
    setDescartadas((prev) => [...itens.map((i) => ({ ...i, oculto: true })), ...prev]);
    setSelecionadasNovas(new Set());
  };

  const excluirSelecionadasTriagem = async () => {
    if (!window.confirm(`Descartar ${selecionadasTriagem.size} licitação(ões)? Elas irão para a aba Descartadas.`)) return;
    const itens = itensSelecionadosTriagem();
    await base44.entities.Licitacao.bulkUpdate(itens.map((item) => ({ id: item.id, oculto: true })));
    setTriagem((prev) => prev.filter((item) => !selecionadasTriagem.has(item.id_licitacao)));
    setDescartadas((prev) => [...itens.map((i) => ({ ...i, oculto: true })), ...prev]);
    setSelecionadasTriagem(new Set());
  };

  const moverSelecionadasTriagem = async () => {
    const itens = itensSelecionadosNovas();
    await base44.entities.Licitacao.bulkUpdate(
      itens.map((item) => ({ id: item.id, status_leitura: "vista", status: "em_analise" }))
    );
    setNovas((prev) => prev.filter((item) => !selecionadasNovas.has(item.id_licitacao)));
    setTriagem((prev) => [...itens.map((i) => ({ ...i, status_leitura: "vista", status: "em_analise" })), ...prev]);
    setSelecionadasNovas(new Set());
  };

  const restaurarSelecionadasDescartadas = async () => {
    const itens = itensSelecionadosDescartadas();
    await base44.entities.Licitacao.bulkUpdate(
      itens.map((item) => ({ id: item.id, oculto: false, status_leitura: "nova", status: "interessado" }))
    );
    setDescartadas((prev) => prev.filter((item) => !selecionadasDescartadas.has(item.id_licitacao)));
    setNovas((prev) => [...itens.map((i) => ({ ...i, oculto: false, status_leitura: "nova", status: "interessado" })), ...prev]);
    setSelecionadasDescartadas(new Set());
  };

  const salvarSelecionadasNovas = () =>
    setFavoritando({ modo: "atualizar", itens: itensSelecionadosNovas() });
  const salvarSelecionadasTriagem = () =>
    setFavoritando({ modo: "atualizar", itens: itensSelecionadosTriagem() });

  const enviarSelecionadasNovas = () => setCompartilhar(itensSelecionadosNovas());
  const enviarSelecionadasTriagem = () => setCompartilhar(itensSelecionadosTriagem());

  const renderActionsFunil = (licitacao, modoTab = "novas") => (
    <div className="flex flex-wrap items-center gap-3 w-full">
      <AtualizacaoActions
        modo={modoTab}
        onSend={() => setCompartilhar([licitacao])}
        onSave={() => handleSaveManual(licitacao)}
        onDelete={() => handleDeleteItem(licitacao)}
        onTriagem={modoTab === "novas" ? () => handleMoverParaTriagem(licitacao) : null}
        onRestaurar={modoTab === "descartadas" ? () => handleRestaurar(licitacao) : null}
      />
      {isAdmin && (
        <button
          onClick={() => excluirDefinitivamente(licitacao)}
          title="Excluir do banco definitivamente (somente administrador)"
          className="inline-flex items-center text-muted-foreground hover:text-red-600 sm:gap-1.5 sm:text-xs ml-auto pt-1"
        >
          <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Excluir do banco</span>
        </button>
      )}
    </div>
  );

  // Triagem direto no card: lista de favoritos, status de gestão e leitura.
  const renderGestaoFunil = (licitacao, opcoes) => (
    <GestaoRapida
      licitacao={licitacao}
      listas={listasFavoritas}
      empilhado={opcoes?.empilhado}
      onUpdated={(id, campo, valor) => {
        setNovas((prev) => prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
        setTriagem((prev) => prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
      }}
    />
  );

  // ---------- Aba "Acervo" (banco global consolidado) ----------
  const [acervo, setAcervo] = useState([]);
  const [acervoLoading, setAcervoLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [buscasSalvasAcervo, setBuscasSalvasAcervo] = useState([]);
  const [salvasIds, setSalvasIds] = useState(new Set());
  const [licitacoesBancoMap, setLicitacoesBancoMap] = useState(new Map());
  const [pagina, setPagina] = useState(1);
  const porPagina = 30;
  const [selecionadosAcervo, setSelecionadosAcervo] = useState(new Set());
  const [enviarEmail, setEnviarEmail] = useState(false);

  const toggleSelecaoAcervo = (id, checked) => {
    setSelecionadosAcervo((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  useEffect(() => {
    // Espera o contexto resolver quem é o usuário; sem isso a primeira execução
    // consultaria com um escopo ainda indefinido e a lista piscaria vazia.
    if (!usuarioLogado) return;
    (async () => {
      try {
        const [cachesList, licitacoesDbList] = await Promise.all([
          // O acervo é o banco global consolidado (ConsultaCache): compartilhado
          // entre usuários de propósito, para economizar chamadas à API.
          base44.entities.ConsultaCache.list("-updated_date", 500),
          // Carrega as licitações cadastradas da unidade para resolver o ciclo de vida
          // (Minhas, Em triagem, Descartadas, Novas) no Acervo Geral.
          base44.entities.Licitacao.filter(
            escopoUnidade(isAdmin, filtroUnidade),
            "-updated_date",
            1000,
          ),
        ]);
        const listaDb = toArray(licitacoesDbList);
        const mapDb = new Map();
        const idsSalvas = new Set();
        for (const l of listaDb) {
          if (l.id_licitacao) {
            mapDb.set(String(l.id_licitacao), l);
            if (!l.oculto && l.favorito) {
              idsSalvas.add(l.id_licitacao);
            }
          }
        }
        setLicitacoesBancoMap(mapDb);
        setSalvasIds(idsSalvas);

        const mapa = new Map();
        for (const cache of toArray(cachesList)) {
          const lics = toArray(cache.resultado?.licitacoes);
          for (const l of lics) {
            if (l?.id_licitacao && !mapa.has(l.id_licitacao)) {
              mapa.set(l.id_licitacao, l);
            }
          }
        }
        // Inclui também as licitações já salvas na base (Licitacao) que não
        // estão no cache global — se atenderem aos critérios de uma busca
        // configurada, precisam aparecer no Acervo.
        for (const l of listaDb) {
          if (l.id_licitacao && !mapa.has(l.id_licitacao) && !l.oculto) {
            mapa.set(l.id_licitacao, l);
          }
        }
        setAcervo(Array.from(mapa.values()));
      } catch (e) {
        setErro(e.message || "Erro ao carregar o banco de licitações.");
      } finally {
        setAcervoLoading(false);
      }
    })();
    // Mesma regra de "ativa" que o funil usa (carregarNovas/carregarTriagem):
    // o Acervo Geral tem que enxergar exatamente as mesmas buscas ativas,
    // sem seletor próprio — senão os dois lugares divergem sobre o que é "novo".
    base44.entities.BuscaSalva
      .filter(escopoUnidade(isAdmin, filtroUnidade), "nome", 100)
      .then((res) => setBuscasSalvasAcervo(toArray(res).filter((b) => b.ativa !== false)));
    // Recarrega ao trocar de unidade no seletor: sem estas dependências a lista
    // ficava congelada no que foi carregado na primeira montagem.
  }, [isAdmin, filtroUnidade, usuarioLogado]);

  // O acervo vem do ConsultaCache, que é global por design (economiza chamadas à
  // API entre usuários). Para não expor o banco inteiro, o recorte é sempre a
  // união dos filtros de TODAS as buscas ativas da unidade (mesma fonte usada
  // pelo funil) — uma licitação aparece se casar com pelo menos uma delas.
  const filtrosDoUsuario = useMemo(
    () => buscasSalvasAcervo.map(filtrosDaBusca),
    [buscasSalvasAcervo]
  );

  // Função para resolver o estado exato de uma licitação no Acervo.
  //
  // O Acervo é o cache global (ConsultaCache) filtrado pelas buscas do
  // usuário — bem mais amplo do que o que foi de fato sincronizado pro banco
  // (Licitacao) desta unidade. Um item só pertence a um estado do funil
  // (novas/triagem/descartadas/minhas) se ele EXISTE como registro Licitacao;
  // caso contrário é "fora_do_funil" — apareceu numa busca mas nunca foi
  // importado, então não é "Nova" nenhuma (evita a pílula/etiqueta mentir
  // sobre estar aguardando triagem quando na real nunca entrou no funil).
  const obterEstadoAcervo = useCallback(
    (l) => {
      const doBanco = licitacoesBancoMap.get(String(l.id_licitacao));
      if (!doBanco) return "fora_do_funil";
      return resolverEstadoLicitacao(doBanco);
    },
    [licitacoesBancoMap]
  );

  // Itens base que passam pelos critérios de busca/filtros geográficos
  const acervoBase = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return acervo.filter((l) => {
      // Mostra só o que casa com pelo menos uma busca ativa da unidade. Sem
      // buscas ativas configuradas, nada é exibido (mesmo critério do funil).
      if (!filtrosDoUsuario.some((f) => combinaComFiltros(l, f))) return false;
      if (filtroUF !== "todos" && l.uf !== filtroUF) return false;
      if (filtroMunicipio !== "todos" && l.municipio !== filtroMunicipio) return false;
      if (filtroModalidade !== "todos" && l.tipo !== filtroModalidade) return false;
      if (!termo) return true;
      return [l.titulo, l.objeto, l.orgao, l.uf, l.municipio, l.tipo]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo));
    });
  }, [acervo, busca, filtrosDoUsuario, filtroUF, filtroMunicipio, filtroModalidade]);

  // Acervo Geral mostra todos os itens que casam com as buscas ativas —
  // incluindo os que ainda não foram importados para o funil ("fora_do_funil").
  const acervoFiltrado = useMemo(() => acervoBase, [acervoBase]);

  useEffect(() => {
    setPagina(1);
    setSelecionadosAcervo(new Set());
  }, [busca, filtroUF, filtroMunicipio, filtroModalidade]);

  const totalPaginas = Math.max(1, Math.ceil(acervoFiltrado.length / porPagina));
  const paginadas = useMemo(
    () => acervoFiltrado.slice((pagina - 1) * porPagina, pagina * porPagina),
    [acervoFiltrado, pagina]
  );

  // Favoritar no acervo também passa pelo seletor de lista. A criação do
  // registro acontece em confirmarFavoritar, no modo "criar".
  const salvar = (lic) => setFavoritando({ modo: "criar", itens: [lic] });

  const listaNavegacao =
    aba === "novas"
      ? novasFiltradas
      : aba === "triagem"
      ? triagemFiltradas
      : aba === "descartadas"
      ? descartadasFiltradas
      : aba === "selecionadas"
      ? selecionadasFiltradas
      : aba === "acervo"
      ? paginadas
      : [];
  const idxSelecionada = selecionada
    ? listaNavegacao.findIndex((l) => l.id_licitacao === selecionada.id_licitacao)
    : -1;

  // Total geral: soma de tudo no banco — registros Licitacao (ativas + descartadas)
  // + itens do cache que ainda não foram importados.
  const totalGeral = novas.length + triagem.length + descartadas.length + selecionadas.length +
    acervo.filter((l) => !licitacoesBancoMap.has(String(l.id_licitacao))).length;

  const countAbaAtual =
    aba === "novas"
      ? novasFiltradas.length
      : aba === "triagem"
      ? triagemFiltradas.length
      : aba === "descartadas"
      ? descartadasFiltradas.length
      : aba === "selecionadas"
      ? selecionadasFiltradas.length
      : acervoFiltrado.length;

  const labelAbaAtual =
    aba === "novas"
      ? "novas"
      : aba === "triagem"
      ? "em triagem"
      : aba === "descartadas"
      ? "descartadas"
      : aba === "selecionadas"
      ? "selecionadas"
      : "no acervo";

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Licitações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Funil completo de triagem: avalie oportunidades, envie para suas listas ou descarte com 1 clique.
          </p>
        </div>
        {/* Contador dinâmico da aba ativa */}
        <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-xs shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {aba === "novas" ? (
              <Sparkles className="w-5 h-5" />
            ) : aba === "triagem" ? (
              <Clock className="w-5 h-5 text-status-blue" />
            ) : aba === "descartadas" ? (
              <Trash2 className="w-5 h-5 text-destructive" />
            ) : aba === "selecionadas" ? (
              <Star className="w-5 h-5 text-status-amber" />
            ) : (
              <Database className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-xl font-bold leading-none">{countAbaAtual}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {aba === "acervo" ? "total no banco" : labelAbaAtual}
            </p>
          </div>
        </div>
      </div>

      {/* Abas do Funil de Triagem */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="inline-flex items-center border rounded-xl overflow-hidden bg-card shadow-xs p-1 gap-1">
          <button
            onClick={() => setAba("novas")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
              aba === "novas"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            }`}
          >
            <Sparkles className="w-4 h-4" /> Novas
            {novasFiltradas.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                aba === "novas" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
              }`}>
                {novasFiltradas.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setAba("triagem")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
              aba === "triagem"
                ? "bg-status-blue text-status-blue-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            }`}
          >
            <Clock className="w-4 h-4" /> Em Triagem / Analisar
            {triagemFiltradas.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                aba === "triagem" ? "bg-white/20 text-white" : "bg-status-blue/10 text-status-blue"
              }`}>
                {triagemFiltradas.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setAba("descartadas")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
              aba === "descartadas"
                ? "bg-muted-foreground/80 text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            }`}
          >
            <Trash2 className="w-4 h-4" /> Descartadas
            {descartadasFiltradas.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                aba === "descartadas" ? "bg-background/30 text-background" : "bg-muted text-muted-foreground"
              }`}>
                {descartadasFiltradas.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setAba("selecionadas")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
              aba === "selecionadas"
                ? "bg-status-amber text-status-amber-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            }`}
          >
            <Star className="w-4 h-4" /> Selecionadas
            {selecionadasFiltradas.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                aba === "selecionadas" ? "bg-white/20 text-white" : "bg-status-amber/10 text-status-amber"
              }`}>
                {selecionadasFiltradas.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setAba("acervo")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all border-l ml-1 pl-3 ${
              aba === "acervo"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            }`}
          >
            <Database className="w-4 h-4" /> Acervo Geral
            {acervoFiltrado.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                aba === "acervo" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
              }`}>
                {acervoFiltrado.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {aba === "novas" ? (
        <>
          {Object.keys(porBuscaOrigem).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(porBuscaOrigem).map(([origem, count]) => (
                <button
                  key={origem}
                  onClick={() => setFiltroOrigem((prev) => (prev === origem ? null : origem))}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
                    filtroOrigem === origem ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                  }`}
                >
                  {origem}: <b>{count}</b>
                </button>
              ))}
              {filtroOrigem && (
                <button onClick={() => setFiltroOrigem(null)} className="text-xs text-muted-foreground underline px-1">
                  Limpar filtro
                </button>
              )}
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 bg-card border rounded-xl p-2 shadow-sm">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por título, órgão, busca de origem..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <FiltrosGeograficos
              ufs={ufsDisponiveis}
              municipios={municipiosDisponiveis}
              modalidades={modalidadesDisponiveis}
              filtroUF={filtroUF}
              setFiltroUF={setFiltroUF}
              filtroMunicipio={filtroMunicipio}
              setFiltroMunicipio={setFiltroMunicipio}
              filtroModalidade={filtroModalidade}
              setFiltroModalidade={setFiltroModalidade}
            />
          </div>

          {/* Barra de Seleção e Ações em Massa (Novas) */}
          {!novasLoading && novasFiltradas.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={novasFiltradas.length > 0 && novasFiltradas.every((item) => selecionadasNovas.has(item.id_licitacao))}
                  onChange={(e) => novasFiltradas.forEach((item) => toggleSelecaoNova(item.id_licitacao, e.target.checked))}
                />
                Selecionar todas ({novasFiltradas.length})
              </label>
              {selecionadasNovas.size > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <AtualizacaoBulkActions
                    quantidade={selecionadasNovas.size}
                    modo="novas"
                    onSend={enviarSelecionadasNovas}
                    onTriagem={moverSelecionadasTriagem}
                    onSave={salvarSelecionadasNovas}
                    onDelete={excluirSelecionadasNovas}
                  />
                </div>
              )}
            </div>
          )}

          <LicitacoesVisualizacao
            licitacoes={novasFiltradas}
            loading={novasLoading}
            vazio={novasFiltradas.length === 0}
            mensagemVazio={
              buscasFiltradas.length === 0 ? (
                <div className="max-w-md mx-auto text-center space-y-3 p-6 bg-card border rounded-2xl shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-status-amber/10 text-status-amber flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-foreground">Nenhuma busca ativa configurada</h4>
                  <p className="text-sm text-muted-foreground">
                    Para visualizar oportunidades aqui, é necessário ter ao menos uma busca ativa salva para a sua unidade. Cadastre ou ative suas buscas em <b>Configurações</b>.
                  </p>
                </div>
              ) : null
            }
            onRowClick={setSelecionada}
            selecionados={selecionadasNovas}
            onToggleSelecao={toggleSelecaoNova}
            renderActions={(lic) => renderActionsFunil(lic, "novas")}
            mostrarStatus={false}
            tagEstado={() => ({
              label: "Nova",
              icone: "✨",
              className: "bg-primary text-primary-foreground ring-primary/30",
            })}
          />
        </>
      ) : aba === "triagem" ? (
        <>
          {/* Informações da Aba Triagem */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-status-blue/5 border border-status-blue/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-status-blue text-status-blue-foreground flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Oportunidades em Triagem / Análise</h3>
                <p className="text-xs text-muted-foreground">
                  Licitações que estão sendo analisadas pela equipe antes de aprovar para Minhas Licitações ou descartar.
                </p>
              </div>
            </div>
          </div>

          {/* Filtros de Triagem */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 bg-card border rounded-xl p-2 shadow-xs">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar em triagem por título, órgão, cidade..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <FiltrosGeograficos
              ufs={ufsDisponiveis}
              municipios={municipiosDisponiveis}
              modalidades={modalidadesDisponiveis}
              filtroUF={filtroUF}
              setFiltroUF={setFiltroUF}
              filtroMunicipio={filtroMunicipio}
              setFiltroMunicipio={setFiltroMunicipio}
              filtroModalidade={filtroModalidade}
              setFiltroModalidade={setFiltroModalidade}
            />
          </div>

          {/* Ações em Massa (Triagem) */}
          {!triagemLoading && triagemFiltradas.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={triagemFiltradas.length > 0 && triagemFiltradas.every((item) => selecionadasTriagem.has(item.id_licitacao))}
                  onChange={(e) => triagemFiltradas.forEach((item) => toggleSelecaoTriagem(item.id_licitacao, e.target.checked))}
                />
                Selecionar todas ({triagemFiltradas.length})
              </label>
              {selecionadasTriagem.size > 0 && (
                <AtualizacaoBulkActions
                  quantidade={selecionadasTriagem.size}
                  modo="triagem"
                  onSend={enviarSelecionadasTriagem}
                  onSave={salvarSelecionadasTriagem}
                  onDelete={excluirSelecionadasTriagem}
                />
              )}
            </div>
          )}

          <LicitacoesVisualizacao
            licitacoes={triagemFiltradas}
            loading={triagemLoading}
            vazio={triagemFiltradas.length === 0}
            mensagemVazio={
              buscasFiltradas.length === 0 ? (
                <div className="max-w-md mx-auto text-center space-y-3 p-6 bg-card border rounded-2xl shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-status-amber/10 text-status-amber flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-foreground">Nenhuma busca ativa configurada</h4>
                  <p className="text-sm text-muted-foreground">
                    As oportunidades em triagem seguem as buscas ativas da sua unidade. Cadastre ou ative buscas em <b>Configurações</b> para gerenciar o funil.
                  </p>
                </div>
              ) : null
            }
            onRowClick={setSelecionada}
            selecionados={selecionadasTriagem}
            onToggleSelecao={toggleSelecaoTriagem}
            renderActions={(lic) => renderActionsFunil(lic, "triagem")}
            renderGestao={renderGestaoFunil}
            tagEstado={() => ({
              label: "Em Triagem",
              icone: "⏱️",
              className: "bg-status-blue text-status-blue-foreground ring-status-blue/30",
            })}
          />
        </>
      ) : aba === "descartadas" ? (
        <>
          {/* Informações da Aba Descartadas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Licitações Descartadas</h3>
                <p className="text-xs text-muted-foreground">
                  Itens descartados durante a triagem. Você pode restaurar qualquer licitação a qualquer momento para voltar a analisá-la.
                </p>
              </div>
            </div>
          </div>

          {/* Filtros Descartadas */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 bg-card border rounded-xl p-2 shadow-xs">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nas descartadas..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <FiltrosGeograficos
              ufs={ufsDisponiveis}
              municipios={municipiosDisponiveis}
              modalidades={modalidadesDisponiveis}
              filtroUF={filtroUF}
              setFiltroUF={setFiltroUF}
              filtroMunicipio={filtroMunicipio}
              setFiltroMunicipio={setFiltroMunicipio}
              filtroModalidade={filtroModalidade}
              setFiltroModalidade={setFiltroModalidade}
            />
          </div>

          {/* Ações em Massa (Descartadas) */}
          {!descartadasLoading && descartadasFiltradas.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={descartadasFiltradas.length > 0 && descartadasFiltradas.every((item) => selecionadasDescartadas.has(item.id_licitacao))}
                  onChange={(e) => descartadasFiltradas.forEach((item) => toggleSelecaoDescartadas(item.id_licitacao, e.target.checked))}
                />
                Selecionar todas ({descartadasFiltradas.length})
              </label>
              {selecionadasDescartadas.size > 0 && (
                <AtualizacaoBulkActions
                  quantidade={selecionadasDescartadas.size}
                  modo="descartadas"
                  onRestaurar={restaurarSelecionadasDescartadas}
                />
              )}
            </div>
          )}

          <LicitacoesVisualizacao
            licitacoes={descartadasFiltradas}
            loading={descartadasLoading}
            vazio={descartadasFiltradas.length === 0}
            mensagemVazio={
              buscasFiltradas.length === 0 ? (
                <div className="max-w-md mx-auto text-center space-y-3 p-6 bg-card border rounded-2xl shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-status-amber/10 text-status-amber flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-foreground">Nenhuma busca ativa configurada</h4>
                  <p className="text-sm text-muted-foreground">
                    O histórico de descarte é filtrado pelas buscas ativas da sua unidade. Cadastre ou ative buscas em <b>Configurações</b> para gerenciar os itens.
                  </p>
                </div>
              ) : null
            }
            onRowClick={setSelecionada}
            selecionados={selecionadasDescartadas}
            onToggleSelecao={toggleSelecaoDescartadas}
            renderActions={(lic) => renderActionsFunil(lic, "descartadas")}
          />
        </>
      ) : aba === "selecionadas" ? (
        <>
          {/* Informações da Aba Selecionadas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-status-amber/5 border border-status-amber/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-status-amber text-status-amber-foreground flex items-center justify-center shrink-0">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Licitações Selecionadas</h3>
                <p className="text-xs text-muted-foreground">
                  Todas as licitações que você favoritou, reunidas em um só lugar para acompanhamento prioritário.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => exportarLicitacoesPDF(selecionadasFiltradas, "Licitações Selecionadas")}
                disabled={selecionadasFiltradas.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 shrink-0"
              >
                <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={() => exportarLicitacoesExcel(selecionadasFiltradas, "selecionadas")}
                disabled={selecionadasFiltradas.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 shrink-0"
              >
                <Sheet className="w-4 h-4" /> <span className="hidden sm:inline">Excel</span>
              </button>
            </div>
          </div>

          {/* Filtros Selecionadas */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 bg-card border rounded-xl p-2 shadow-xs">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nas selecionadas por título, órgão, cidade..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <FiltrosGeograficos
              ufs={ufsDisponiveis}
              municipios={municipiosDisponiveis}
              modalidades={modalidadesDisponiveis}
              filtroUF={filtroUF}
              setFiltroUF={setFiltroUF}
              filtroMunicipio={filtroMunicipio}
              setFiltroMunicipio={setFiltroMunicipio}
              filtroModalidade={filtroModalidade}
              setFiltroModalidade={setFiltroModalidade}
            />
          </div>

          <LicitacoesVisualizacao
            licitacoes={selecionadasFiltradas}
            loading={selecionadasLoading}
            vazio={selecionadasFiltradas.length === 0}
            onRowClick={setSelecionada}
            selecionados={selecionadasSelecionadas}
            onToggleSelecao={toggleSelecao(setSelecionadasSelecionadas)}
            renderActions={(lic) => renderActionsFunil(lic, "selecionadas")}
            renderGestao={renderGestaoFunil}
          />
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 bg-card border rounded-xl p-2 shadow-sm">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por título, órgão, UF, município ou modalidade..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <FiltrosGeograficos
              ufs={ufsDisponiveis}
              municipios={municipiosDisponiveis}
              modalidades={modalidadesDisponiveis}
              filtroUF={filtroUF}
              setFiltroUF={setFiltroUF}
              filtroMunicipio={filtroMunicipio}
              setFiltroMunicipio={setFiltroMunicipio}
              filtroModalidade={filtroModalidade}
              setFiltroModalidade={setFiltroModalidade}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {selecionadosAcervo.size > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                <span>{selecionadosAcervo.size} selecionada{selecionadosAcervo.size === 1 ? "" : "s"}</span>
                <button
                  onClick={() => setEnviarEmail(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-md hover:bg-muted"
                >
                  <Mail className="w-4 h-4" /> <span className="hidden sm:inline">E-mail</span>
                </button>
              </div>
            )}
            <button
              onClick={() => exportarLicitacoesPDF(acervoFiltrado, "Banco de Licitação")}
              disabled={acervoFiltrado.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 shrink-0"
            >
              <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => exportarLicitacoesExcel(acervoFiltrado, "banco-licitacoes")}
              disabled={acervoFiltrado.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 shrink-0"
            >
              <Sheet className="w-4 h-4" /> <span className="hidden sm:inline">Excel</span>
            </button>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{erro}</div>
          )}

          {/* Explica o recorte: sem isso o acervo parece incompleto. */}
          <p className="text-xs text-muted-foreground">
            {filtrosDoUsuario.length === 0
              ? "Nenhuma busca ativa configurada — ative uma busca em Configuração para ver licitações do acervo aqui."
              : `Exibindo o que corresponde às ${filtrosDoUsuario.length} busca(s) ativa(s) em Configuração.`}
          </p>

          <LicitacoesVisualizacao
            licitacoes={paginadas}
            loading={acervoLoading}
            vazio={acervoFiltrado.length === 0}
            onRowClick={setSelecionada}
            selecionados={selecionadosAcervo}
            onToggleSelecao={toggleSelecaoAcervo}
            tagEstado={(lic) => {
              const estado = obterEstadoAcervo(lic);
              if (estado === "descartadas") {
                return {
                  label: "Descartada",
                  icone: "🗑️",
                  className: "bg-destructive text-destructive-foreground ring-destructive/30",
                };
              }
              if (estado === "minhas") {
                return {
                  label: "Minha",
                  icone: "⭐",
                  className: "bg-status-amber text-status-amber-foreground ring-status-amber/30",
                };
              }
              if (estado === "triagem") {
                return {
                  label: "Em Triagem",
                  icone: "⏱️",
                  className: "bg-status-blue text-status-blue-foreground ring-status-blue/30",
                };
              }
              if (estado === "novas") {
                return {
                  label: "Nova",
                  icone: "✨",
                  className: "bg-primary text-primary-foreground ring-primary/30",
                };
              }
              // "fora_do_funil": apareceu na busca mas nunca foi sincronizada pro
              // banco desta unidade — sem etiqueta, pra não parecer que está em Novas.
              return null;
            }}
            renderActions={(lic) => {
              const jaSalva = salvasIds.has(lic.id_licitacao);
              return jaSalva ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <Check className="w-4 h-4" /> Favoritada
                </span>
              ) : (
                <button
                  onClick={() => salvar(lic)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90"
                >
                  <Star className="w-3.5 h-3.5" /> Favoritar
                </button>
              );
            }}
          />

          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{pagina}</span> de {totalPaginas}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {selecionada && (
        <LicitacaoDetailDialog
          licitacao={selecionada}
          onClose={() => setSelecionada(null)}
          onFavoritar={aba === "acervo" ? salvar : handleSaveManual}
          onPrev={idxSelecionada > 0 ? () => setSelecionada(listaNavegacao[idxSelecionada - 1]) : null}
          onNext={idxSelecionada >= 0 && idxSelecionada < listaNavegacao.length - 1 ? () => setSelecionada(listaNavegacao[idxSelecionada + 1]) : null}
        />
      )}

      {compartilhar?.length > 0 && (
        <EmailResultsDialog
          licitacoes={compartilhar}
          origem={compartilhar.length === 1 ? compartilhar[0].busca_origem : "Licitações selecionadas"}
          onClose={() => setCompartilhar(null)}
        />
      )}

      {enviarEmail && (
        <EmailResultsDialog
          licitacoes={paginadas.filter((l) => selecionadosAcervo.has(l.id_licitacao))}
          origem="Banco de Licitação"
          onClose={() => setEnviarEmail(false)}
        />
      )}

      {favoritando && (
        <SeletorListaDialog
          quantidade={favoritando.itens.length}
          listas={listasFavoritas}
          onCriarLista={criarListaFavorita}
          onConfirm={confirmarFavoritar}
          onClose={() => setFavoritando(null)}
        />
      )}
    </div>
  );
}