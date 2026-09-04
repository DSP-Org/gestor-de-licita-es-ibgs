import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";
import { escopoUnidade, unidadeEfetiva, pertenceAUnidade } from "@/lib/escopoUnidade";
import {
  Search, Star, Check, Loader2, Database, ChevronLeft, ChevronRight,
  FileDown, Sheet, Mail, Zap, AlertCircle, Sparkles, Trash2,
} from "lucide-react";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import EmailResultsDialog from "@/components/licitacoes/EmailResultsDialog";
import AtualizacaoActions from "@/components/licitacoes/AtualizacaoActions";
import AtualizacaoBulkActions from "@/components/licitacoes/AtualizacaoBulkActions";
import LicitacoesVisualizacao from "@/components/licitacoes/LicitacoesVisualizacao";
import GestaoRapida from "@/components/licitacoes/GestaoRapida";
import SeletorListaDialog from "@/components/licitacoes/SeletorListaDialog";
import BuscaMultiSelect from "@/components/buscas/BuscaMultiSelect";
import AcervoFiltros from "@/components/licitacoes/AcervoFiltros";
import FavoritasTab from "@/components/licitacoes/FavoritasTab";
import { toArray } from "@/lib/toArray";
import { MODALIDADES, buscarLicitacoes } from "@/shared/alertaApi";
import { exportarLicitacoesPDF } from "@/lib/exportarLicitacoesPDF";
import { exportarLicitacoesExcel } from "@/lib/exportarLicitacoesExcel";

const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export default function BancoLicitacoes() {
  const [aba, setAba] = useState("novas");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState(null);
  const { isAdmin, filtroUnidade, usuarioLogado, unidades } = useUnidadeFilter();

  // ---------- Aba "Novas" (sincronização automática) ----------
  const [novas, setNovas] = useState([]);
  const [novasLoading, setNovasLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState(null);
  const [buscasSalvas, setBuscasSalvas] = useState([]);
  const [buscasSelecionadas, setBuscasSelecionadas] = useState([]);
  const [compartilhar, setCompartilhar] = useState(null);
  const [selecionadasNovas, setSelecionadasNovas] = useState(new Set());
  const [filtroOrigem, setFiltroOrigem] = useState(null);
  // Admin: mostra só registros sem unidade vinculada (legado da migração pra
  // multi-tenant) pra poder selecionar e atribuir em massa a uma unidade real.
  const [filtroSemUnidade, setFiltroSemUnidade] = useState(false);
  const [unidadeParaAtribuir, setUnidadeParaAtribuir] = useState("");
  const [atribuindoUnidade, setAtribuindoUnidade] = useState(false);
  // Carregadas uma vez e compartilhadas por todos os cards, para o seletor de
  // lista não disparar uma consulta por licitação.
  const [listasFavoritas, setListasFavoritas] = useState([]);
  // { modo: "atualizar" | "criar", itens: [...] } enquanto o seletor de lista está aberto.
  const [favoritando, setFavoritando] = useState(null);

  const carregarNovas = async () => {
    setNovasLoading(true);
    try {
      // Filtra APENAS licitações com status_leitura = "nova"
      // oculto: descartadas continuam no banco, mas somem das listagens.
      // Modo "sem unidade" (admin): ignora status/oculto pra achar todo o
      // backlog órfão, e pede o teto de leitura da API pra caber tudo de uma vez.
      const modoSemUnidade = isAdmin && filtroSemUnidade;
      const filtro = modoSemUnidade
        ? { unidade_negocio_id: null }
        : { status_leitura: "nova", oculto: { $ne: true }, ...escopoUnidade(isAdmin, filtroUnidade) };

      const lista = await base44.entities.Licitacao.filter(
        filtro,
        "-created_date",
        modoSemUnidade ? 5000 : 500
      );
      setNovas(toArray(lista));
    } finally {
      setNovasLoading(false);
    }
  };

  const marcarLeitura = async (licId, novoStatus) => {
    try {
      await base44.entities.Licitacao.update(licId, { status_leitura: novoStatus });
      carregarNovas(); // Recarrega para remover se marcou como vista/lida
    } catch (e) {
      console.error("Erro ao marcar leitura:", e);
    }
  };

  useEffect(() => {
    if (!usuarioLogado) return;
    carregarNovas();

    const filtroBuscas = { ativa: true, ...escopoUnidade(isAdmin, filtroUnidade) };

    base44.entities.BuscaSalva.filter(filtroBuscas, "nome", 100).then((res) => {
      const lista = toArray(res);
      setBuscasSalvas(lista);
      setBuscasSelecionadas(lista.map((item) => item.id));
    });

    base44.entities.FavoritaLista
      .filter(escopoUnidade(isAdmin, filtroUnidade), "ordem", 100)
      .then((res) => setListasFavoritas(toArray(res).sort((a, b) => (a.ordem || 0) - (b.ordem || 0))))
      .catch(() => setListasFavoritas([]));
  }, [filtroUnidade, isAdmin, usuarioLogado, filtroSemUnidade]);

  const buscasFiltradas = useMemo(
    () => buscasSalvas.filter((b) => pertenceAUnidade(b, filtroUnidade)),
    [buscasSalvas, filtroUnidade],
  );

  useEffect(() => {
    setBuscasSelecionadas([]);
  }, [buscasFiltradas]);

  const novasFiltradas = useMemo(() => {
    const agora = new Date();
    const hojeZeroHora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    return novas.filter((l) => {
      if (!pertenceAUnidade(l, filtroUnidade)) return false;
      if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
      if (filtroOrigem && (l.busca_origem || "Sem origem") !== filtroOrigem) return false;
      // Se não for favorita e a data de abertura já passou, não exibe em Novas
      if (!l.favorito && l.abertura_datetime) {
        const dtAbertura = new Date(l.abertura_datetime);
        if (!isNaN(dtAbertura.getTime()) && dtAbertura < hojeZeroHora) return false;
      }
      if (busca) {
        const q = busca.toLowerCase();
        const txt = `${l.titulo} ${l.objeto} ${l.orgao} ${l.municipio} ${l.uf} ${l.id_licitacao} ${l.busca_origem || ""}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [novas, filtroStatus, busca, filtroUnidade, filtroOrigem]);

  // Contagem por origem. Respeita unidade, status e termo de busca, mas de
  // propósito ignora o próprio filtro de origem: se o considerasse, escolher uma
  // origem zeraria as demais e não haveria como trocar de seleção.
  const porBuscaOrigem = useMemo(() => {
    const agora = new Date();
    const hojeZeroHora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const grupos = {};
    novas
      .filter((l) => {
        if (!pertenceAUnidade(l, filtroUnidade)) return false;
        if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
        if (!l.favorito && l.abertura_datetime) {
          const dtAbertura = new Date(l.abertura_datetime);
          if (!isNaN(dtAbertura.getTime()) && dtAbertura < hojeZeroHora) return false;
        }
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
  }, [novas, filtroUnidade, filtroStatus, busca]);

  const sincronizarAgora = async () => {
    setSincronizando(true);
    setResultadoSync(null);
    try {
      const res = await base44.functions.invoke("sincronizarBuscas", { buscaIds: buscasSelecionadas });
      setResultadoSync(res.data || res);
      carregarNovas();
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
    carregarNovas();
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

  // Descartar apenas oculta: o registro continua no banco e só o administrador
  // pode removê-lo de vez.
  const handleDeleteNova = async (licitacao) => {
    if (!window.confirm(`Descartar "${licitacao.titulo}"? Ela sai da sua lista, mas continua no banco.`)) return;
    await base44.entities.Licitacao.update(licitacao.id, { oculto: true });
    setNovas((prev) => prev.filter((l) => l.id !== licitacao.id));
    setSelecionadasNovas((prev) => {
      const nova = new Set(prev);
      nova.delete(licitacao.id_licitacao);
      return nova;
    });
  };

  const excluirDefinitivamente = async (licitacao) => {
    if (!isAdmin) return;
    if (!window.confirm(`Excluir "${licitacao.titulo}" DEFINITIVAMENTE do banco? Esta ação não pode ser desfeita.`)) return;
    await base44.entities.Licitacao.delete(licitacao.id);
    setNovas((prev) => prev.filter((l) => l.id !== licitacao.id));
  };

  const toggleSelecaoNova = (idLicitacao, marcada) => {
    setSelecionadasNovas((prev) => {
      const nova = new Set(prev);
      marcada ? nova.add(idLicitacao) : nova.delete(idLicitacao);
      return nova;
    });
  };

  const itensSelecionadosNovas = () => novas.filter((item) => selecionadasNovas.has(item.id_licitacao));

  const excluirSelecionadasNovas = async () => {
    if (!window.confirm(`Descartar ${selecionadasNovas.size} licitação(ões)? Elas saem da sua lista, mas continuam no banco.`)) return;
    const itens = itensSelecionadosNovas();
    await base44.entities.Licitacao.bulkUpdate(itens.map((item) => ({ id: item.id, oculto: true })));
    setNovas((prev) => prev.filter((item) => !selecionadasNovas.has(item.id_licitacao)));
    setSelecionadasNovas(new Set());
  };

  const salvarSelecionadasNovas = () =>
    setFavoritando({ modo: "atualizar", itens: itensSelecionadosNovas() });

  const enviarSelecionadasNovas = () => setCompartilhar(itensSelecionadosNovas());

  // Admin: vincula as licitações selecionadas (tipicamente sem unidade) à
  // unidade escolhida. bulkUpdate aceita até 500 por chamada, daí o lote.
  const atribuirUnidadeSelecionadas = async () => {
    if (!unidadeParaAtribuir) return;
    const itens = itensSelecionadosNovas();
    setAtribuindoUnidade(true);
    try {
      for (let i = 0; i < itens.length; i += 500) {
        const lote = itens.slice(i, i + 500);
        await base44.entities.Licitacao.bulkUpdate(
          lote.map((item) => ({ id: item.id, unidade_negocio_id: unidadeParaAtribuir }))
        );
      }
      setNovas((prev) =>
        filtroSemUnidade
          ? prev.filter((item) => !selecionadasNovas.has(item.id_licitacao))
          : prev.map((item) =>
              selecionadasNovas.has(item.id_licitacao) ? { ...item, unidade_negocio_id: unidadeParaAtribuir } : item
            )
      );
      setSelecionadasNovas(new Set());
    } finally {
      setAtribuindoUnidade(false);
    }
  };

  const renderActionsNova = (licitacao) => (
    <div className="flex flex-wrap items-center gap-3">
      <AtualizacaoActions
        onSend={() => setCompartilhar([licitacao])}
        onSave={() => handleSaveManual(licitacao)}
        onDelete={() => handleDeleteNova(licitacao)}
      />
      {isAdmin && (
        <button
          onClick={() => excluirDefinitivamente(licitacao)}
          title="Excluir do banco (somente administrador)"
          className="inline-flex items-center text-muted-foreground hover:text-red-600 sm:gap-1.5 sm:text-xs"
        >
          <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Excluir do banco</span>
        </button>
      )}
    </div>
  );

  // Triagem direto no card: lista de favoritos, status de gestão e leitura.
  // A licitação some da aba só na próxima carga, para dar chance de desfazer.
  const renderGestaoNova = (licitacao, opcoes) => (
    <GestaoRapida
      licitacao={licitacao}
      listas={listasFavoritas}
      empilhado={opcoes?.empilhado}
      onUpdated={(id, campo, valor) =>
        setNovas((prev) => prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)))
      }
    />
  );

  // ---------- Aba "Acervo" (banco global consolidado) ----------
  const [acervo, setAcervo] = useState([]);
  const [acervoLoading, setAcervoLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [filtroUf, setFiltroUf] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState("");
  const [buscasSalvasAcervo, setBuscasSalvasAcervo] = useState([]);
  const [filtroBuscaId, setFiltroBuscaId] = useState("");
  const [filtroModoAcervo, setFiltroModoAcervo] = useState("config"); // "config" (busca salva) ou "livre" (filtros manuais)
  const [filtroPalavraChaveLivre, setFiltroPalavraChaveLivre] = useState("");
  const [filtroModoPalavrasLivre, setFiltroModoPalavrasLivre] = useState("qualquer");
  const [salvasIds, setSalvasIds] = useState(new Set());
  const [pagina, setPagina] = useState(1);
  const porPagina = 30;
  const [buscandoApi, setBuscandoApi] = useState(false);
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
        const [cachesList, salvasList] = await Promise.all([
          // O acervo é o banco global consolidado (ConsultaCache): compartilhado
          // entre usuários de propósito, para economizar chamadas à API.
          base44.entities.ConsultaCache.list("-updated_date", 500),
          // Já as licitações salvas marcam o que ESTA unidade favoritou, então
          // precisam respeitar o seletor — senão o master vê "Favoritada" em
          // itens que outra unidade favoritou.
          base44.entities.Licitacao.filter(
            { oculto: { $ne: true }, ...escopoUnidade(isAdmin, filtroUnidade) },
            "-updated_date",
            500,
          ),
        ]);
        setSalvasIds(new Set(toArray(salvasList).map((l) => l.id_licitacao)));

        const mapa = new Map();
        for (const cache of toArray(cachesList)) {
          const lics = toArray(cache.resultado?.licitacoes);
          for (const l of lics) {
            if (l?.id_licitacao && !mapa.has(l.id_licitacao)) {
              mapa.set(l.id_licitacao, l);
            }
          }
        }
        setAcervo(Array.from(mapa.values()));
      } catch (e) {
        setErro(e.message || "Erro ao carregar o banco de licitações.");
      } finally {
        setAcervoLoading(false);
      }
    })();
    base44.entities.BuscaSalva
      .filter(escopoUnidade(isAdmin, filtroUnidade), "nome", 100)
      .then((res) => setBuscasSalvasAcervo(toArray(res)));
    // A busca escolhida pode pertencer à unidade anterior.
    setFiltroBuscaId("");
    // Recarrega ao trocar de unidade no seletor: sem estas dependências a lista
    // ficava congelada no que foi carregado na primeira montagem.
  }, [isAdmin, filtroUnidade, usuarioLogado]);

  const buscaSelecionada = useMemo(
    () => buscasSalvasAcervo.find((b) => b.id === filtroBuscaId) || null,
    [buscasSalvasAcervo, filtroBuscaId]
  );

  const configFiltros = useMemo(() => {
    if (filtroModoAcervo !== "config" || !buscaSelecionada) return null;
    return {
      ufs: (buscaSelecionada.uf || "").split(",").map((s) => s.trim()).filter(Boolean),
      modalidades: (buscaSelecionada.modalidade || "").split(",").map((s) => s.trim()).filter(Boolean),
      municipioIbge: buscaSelecionada.municipio_ibge || "",
      palavraChave: buscaSelecionada.palavra_chave || "",
      modoPalavras: buscaSelecionada.modo_palavras || "qualquer",
    };
  }, [buscaSelecionada, filtroModoAcervo]);

  const combinaComPalavraChave = (l, palavraChave, modoPalavras) => {
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

  // Converte uma busca salva no mesmo formato de filtro usado pelo modo "config".
  const filtrosDaBusca = (b) => ({
    ufs: (b.uf || "").split(",").map((s) => s.trim()).filter(Boolean),
    modalidades: (b.modalidade || "").split(",").map((s) => s.trim()).filter(Boolean),
    municipioIbge: b.municipio_ibge || "",
    palavraChave: b.palavra_chave || "",
    modoPalavras: b.modo_palavras || "qualquer",
  });

  const combinaComFiltros = (l, f) => {
    if (f.ufs.length && !f.ufs.includes(l.uf)) return false;
    if (f.modalidades.length && !f.modalidades.includes(String(l.id_tipo))) return false;
    if (f.municipioIbge && l.municipio_IBGE !== f.municipioIbge) return false;
    return combinaComPalavraChave(l, f.palavraChave, f.modoPalavras);
  };

  // O acervo vem do ConsultaCache, que é global por design (economiza chamadas à
  // API entre usuários). Para não expor o banco inteiro, o recorte padrão é a
  // união dos filtros das buscas salvas do usuário selecionado: uma licitação
  // aparece se casar com pelo menos uma delas.
  const filtrosDoUsuario = useMemo(
    () => buscasSalvasAcervo.map(filtrosDaBusca),
    [buscasSalvasAcervo]
  );

  const ufsLivreSelecionadas = useMemo(
    () => (filtroUf || "").split(",").map((s) => s.trim()).filter(Boolean),
    [filtroUf]
  );

  const cidadesDisponiveis = useMemo(() => {
    const base = ufsLivreSelecionadas.length ? acervo.filter((l) => ufsLivreSelecionadas.includes(l.uf)) : acervo;
    return Array.from(new Set(base.map((l) => l.municipio).filter(Boolean))).sort();
  }, [acervo, ufsLivreSelecionadas]);

  const cidadesLivreSelecionadas = useMemo(
    () => (filtroCidade || "").split(",").map((s) => s.trim()).filter(Boolean),
    [filtroCidade]
  );

  const filtrosLivrePreenchidos =
    (ufsLivreSelecionadas.length ? 1 : 0) +
    (cidadesLivreSelecionadas.length ? 1 : 0) +
    (filtroModalidade ? 1 : 0) +
    (filtroPalavraChaveLivre.trim() ? 1 : 0);

  const modalidadesDisponiveis = useMemo(() => {
    return Array.from(new Set(acervo.map((l) => l.tipo).filter(Boolean))).sort();
  }, [acervo]);

  const acervoFiltrado = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return acervo.filter((l) => {
      if (configFiltros) {
        if (!combinaComFiltros(l, configFiltros)) return false;
      } else if (filtroModoAcervo === "livre" && filtrosLivrePreenchidos >= 2) {
        if (ufsLivreSelecionadas.length && !ufsLivreSelecionadas.includes(l.uf)) return false;
        if (cidadesLivreSelecionadas.length && !cidadesLivreSelecionadas.includes(l.municipio)) return false;
        if (filtroModalidade && l.tipo !== filtroModalidade) return false;
        if (!combinaComPalavraChave(l, filtroPalavraChaveLivre, filtroModoPalavrasLivre)) return false;
      } else if (!filtrosDoUsuario.some((f) => combinaComFiltros(l, f))) {
        // Sem busca escolhida e sem filtros livres: mostra apenas o que casa com
        // as buscas salvas do usuário. Sem buscas salvas, nada é exibido.
        return false;
      }
      if (!termo) return true;
      return [l.titulo, l.objeto, l.orgao, l.uf, l.municipio, l.tipo]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo));
    });
  }, [acervo, busca, ufsLivreSelecionadas, cidadesLivreSelecionadas, filtroModalidade, configFiltros, filtroModoAcervo, filtroPalavraChaveLivre, filtroModoPalavrasLivre, filtrosLivrePreenchidos, filtrosDoUsuario]);

  useEffect(() => {
    setPagina(1);
    setSelecionadosAcervo(new Set());
  }, [busca, filtroUf, filtroCidade, filtroModalidade, filtroBuscaId, filtroModoAcervo, filtroPalavraChaveLivre, filtroModoPalavrasLivre]);

  useEffect(() => {
    setFiltroCidade("");
  }, [filtroUf]);

  const totalPaginas = Math.max(1, Math.ceil(acervoFiltrado.length / porPagina));
  const paginadas = useMemo(
    () => acervoFiltrado.slice((pagina - 1) * porPagina, pagina * porPagina),
    [acervoFiltrado, pagina]
  );

  const buscarNaApi = async () => {
    const modalidadeCodigo = MODALIDADES.find((m) => m.nome === filtroModalidade)?.id || "";
    if (!filtroUf && !busca.trim() && !modalidadeCodigo) {
      setErro("Informe um estado, modalidade ou termo de busca para consultar novas licitações.");
      return;
    }
    setErro("");
    setBuscandoApi(true);
    try {
      const data = await buscarLicitacoes({
        uf: filtroUf || undefined,
        palavra_chave: busca.trim() || undefined,
        modalidade: modalidadeCodigo || undefined,
        data_insercao: hojeISO(),
        pagina: 1,
        licitacoesPorPagina: 50,
      });
      if (data.totalErros > 0) {
        setErro(data.erros.map((e) => e.descricao).join("; "));
      } else {
        const novasApi = toArray(data.licitacoes);
        setAcervo((prev) => {
          const mapa = new Map(prev.map((l) => [l.id_licitacao, l]));
          novasApi.forEach((l) => {
            if (l?.id_licitacao) mapa.set(l.id_licitacao, l);
          });
          return Array.from(mapa.values());
        });
      }
    } catch (e) {
      setErro(e.message || "Erro ao consultar novas licitações.");
    } finally {
      setBuscandoApi(false);
    }
  };

  // Favoritar no acervo também passa pelo seletor de lista. A criação do
  // registro acontece em confirmarFavoritar, no modo "criar".
  const salvar = (lic) => setFavoritando({ modo: "criar", itens: [lic] });

  const listaNavegacao = aba === "novas" ? novasFiltradas : aba === "acervo" ? paginadas : [];
  const idxSelecionada = selecionada
    ? listaNavegacao.findIndex((l) => l.id_licitacao === selecionada.id_licitacao)
    : -1;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Database className="w-5 h-5" /> Licitações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Novidades da sincronização automática e o acervo que corresponde às suas buscas, em um só lugar.
          </p>
        </div>
        {/* O contador acompanha a aba ativa e usa as listas já filtradas */}
        <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {aba === "novas" ? <Sparkles className="w-5 h-5" /> : <Database className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-xl font-bold leading-none">
              {aba === "novas" ? novasFiltradas.length : acervoFiltrado.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {aba === "novas" ? "novas" : "no acervo"}
            </p>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="inline-flex items-center border rounded-lg overflow-hidden bg-card shadow-sm">
          <button
            onClick={() => setAba("novas")}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium ${aba === "novas" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <Sparkles className="w-4 h-4" /> Novas
          </button>
          <button
            onClick={() => setAba("acervo")}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-l ${aba === "acervo" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <Database className="w-4 h-4" /> Acervo
          </button>
        </div>
      </div>

      {aba === "novas" ? (
        <>
          {/* Painel de sincronização */}
          <div className="bg-card border rounded-xl p-3 sm:p-5 shadow-sm space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-heading font-semibold text-sm sm:text-base">Sincronização automática</h2>
                {/* novasFiltradas, não novas: o número precisa acompanhar o
                    usuário selecionado, o status, a origem e o termo de busca —
                    a mesma origem da lista logo abaixo. */}
                <p className="text-xs sm:text-sm text-muted-foreground mt-0">
                  {novasFiltradas.length} licitação(ões) encontradas.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <BuscaMultiSelect
                options={buscasFiltradas}
                value={buscasSelecionadas}
                onChange={setBuscasSelecionadas}
                disabled={sincronizando || buscasFiltradas.length === 0}
              />
              <button
                onClick={sincronizarAgora}
                disabled={sincronizando || buscasSelecionadas.length === 0}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90 disabled:opacity-50 sm:shrink-0"
              >
                {sincronizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {sincronizando ? "Sincronizando..." : "Sincronizar agora"}
              </button>
            </div>

            {resultadoSync && (
              <div className={`text-sm rounded-md p-3 ${resultadoSync.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {resultadoSync.error ? (
                  <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Erro: {resultadoSync.error}</span>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-1.5"><Check className="w-4 h-4" /> {resultadoSync.buscasProcessadas} busca(s) processada(s), {resultadoSync.totalNovas} nova(s) licitação(ões).</p>
                    {resultadoSync.resumo?.length > 0 && (
                      <ul className="text-xs space-y-0.5 mt-2">
                        {resultadoSync.resumo.map((r, i) => (
                          <li key={i}>
                            <b>{r.busca}</b>: {r.erro ? `❌ ${r.erro}` : `${r.novas} novas de ${r.total}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {Object.keys(porBuscaOrigem).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
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
          </div>

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
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="flex-1 sm:flex-none min-w-[8.5rem] px-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="todos">Todos os status</option>
              <option value="interessado">Interessado</option>
              <option value="acompanhando">Acompanhando</option>
              <option value="participando">Participando</option>
              <option value="vencida">Vencida</option>
              <option value="ganha">Ganha</option>
              <option value="perdida">Perdida</option>
              <option value="descartada">Descartada</option>
            </select>
            {isAdmin && (
              <label className="flex items-center gap-1.5 text-sm px-2 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={filtroSemUnidade}
                  onChange={(e) => setFiltroSemUnidade(e.target.checked)}
                  className="w-4 h-4"
                />
                Sem unidade
              </label>
            )}
          </div>

          {!novasLoading && novasFiltradas.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={novasFiltradas.length > 0 && novasFiltradas.every((item) => selecionadasNovas.has(item.id_licitacao))}
                  onChange={(e) => novasFiltradas.forEach((item) => toggleSelecaoNova(item.id_licitacao, e.target.checked))}
                />
                Selecionar todas
              </label>
              {selecionadasNovas.size > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={unidadeParaAtribuir}
                        onChange={(e) => setUnidadeParaAtribuir(e.target.value)}
                        className="px-2 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Atribuir à unidade...</option>
                        {unidades.map((un) => (
                          <option key={un.id} value={un.id}>{un.nome}</option>
                        ))}
                      </select>
                      <button
                        onClick={atribuirUnidadeSelecionadas}
                        disabled={!unidadeParaAtribuir || atribuindoUnidade}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                      >
                        {atribuindoUnidade ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Atribuir ({selecionadasNovas.size})
                      </button>
                    </div>
                  )}
                  <AtualizacaoBulkActions
                    quantidade={selecionadasNovas.size}
                    onSend={enviarSelecionadasNovas}
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
            onRowClick={setSelecionada}
            selecionados={selecionadasNovas}
            onToggleSelecao={toggleSelecaoNova}
            renderActions={renderActionsNova}
            renderGestao={renderGestaoNova}
          />
        </>
      ) : (
        <>
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por título, órgão, UF, município ou modalidade..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start gap-3">
              <div className="flex-1">
                <AcervoFiltros
                  buscasSalvas={buscasSalvasAcervo}
                  filtroBuscaId={filtroBuscaId}
                  onChangeBuscaId={setFiltroBuscaId}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
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
            </div>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{erro}</div>
          )}

          {/* Explica o recorte padrão: sem isso o acervo parece incompleto. */}
          {!configFiltros && !(filtroModoAcervo === "livre" && filtrosLivrePreenchidos >= 2) && (
            <p className="text-xs text-muted-foreground">
              {filtrosDoUsuario.length === 0
                ? "Nenhuma busca salva configurada — crie uma busca para ver licitações do acervo aqui."
                : `Exibindo o que corresponde às ${filtrosDoUsuario.length} busca(s) salva(s). Escolha uma busca acima ou use os filtros livres para outro recorte.`}
            </p>
          )}

          <LicitacoesVisualizacao
            licitacoes={paginadas}
            loading={acervoLoading}
            vazio={acervoFiltrado.length === 0}
            onRowClick={setSelecionada}
            selecionados={selecionadosAcervo}
            onToggleSelecao={toggleSelecaoAcervo}
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
          onSave={aba === "novas" ? handleSaveNova : async (dados) => { await salvar(dados); setSelecionada(null); }}
          onPrev={idxSelecionada > 0 ? () => setSelecionada(listaNavegacao[idxSelecionada - 1]) : null}
          onNext={idxSelecionada >= 0 && idxSelecionada < listaNavegacao.length - 1 ? () => setSelecionada(listaNavegacao[idxSelecionada + 1]) : null}
          onMarcarLeitura={aba === "novas" ? marcarLeitura : null}
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