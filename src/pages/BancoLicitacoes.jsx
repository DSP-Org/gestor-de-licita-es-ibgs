import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useUserFilter } from "@/lib/UserFilterContext";
import {
  Search, Star, Check, Loader2, Database, LayoutGrid, Table, ChevronLeft, ChevronRight,
  FileDown, Sheet, RefreshCw, Mail, Zap, AlertCircle, Sparkles,
} from "lucide-react";
import LicitacaoCard from "@/components/licitacoes/LicitacaoCard";
import LicitacaoTable from "@/components/licitacoes/LicitacaoTable";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import EmailResultsDialog from "@/components/licitacoes/EmailResultsDialog";
import AtualizacaoActions from "@/components/licitacoes/AtualizacaoActions";
import AtualizacaoBulkActions from "@/components/licitacoes/AtualizacaoBulkActions";
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
  const [modo, setModo] = useState("cards");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState(null);
  const { isAdmin, filtroUsuario, usuarioLogado } = useUserFilter();

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

  const carregarNovas = async () => {
    setNovasLoading(true);
    try {
      // Filtra APENAS licitações com status_leitura = "nova"
      const filtro = isAdmin && filtroUsuario === "todos"
        ? { status_leitura: "nova" }
        : { status_leitura: "nova", usuario_id: filtroUsuario };

      const lista = await base44.entities.Licitacao.filter(
        filtro,
        "-created_date",
        500
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

    const filtroBuscas = isAdmin && filtroUsuario === "todos"
      ? { ativa: true }
      : { ativa: true, $or: [{ usuario_id: filtroUsuario }, { created_by_id: filtroUsuario }] };

    base44.entities.BuscaSalva.filter(filtroBuscas, "nome", 100).then((res) => {
      const lista = toArray(res);
      setBuscasSalvas(lista);
      setBuscasSelecionadas(lista.map((item) => item.id));
    });
  }, [filtroUsuario, isAdmin, usuarioLogado]);

  const buscasFiltradas = useMemo(() => {
    if (filtroUsuario === "todos") return buscasSalvas;
    return buscasSalvas.filter((b) => b.created_by_id === filtroUsuario || b.usuario_id === filtroUsuario);
  }, [buscasSalvas, filtroUsuario]);

  useEffect(() => {
    setBuscasSelecionadas([]);
  }, [buscasFiltradas]);

  const novasFiltradas = useMemo(() => {
    return novas.filter((l) => {
      if (filtroUsuario !== "todos" && l.created_by_id !== filtroUsuario && l.usuario_id !== filtroUsuario) return false;
      if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
      if (filtroOrigem && (l.busca_origem || "Sem origem") !== filtroOrigem) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const txt = `${l.titulo} ${l.objeto} ${l.orgao} ${l.municipio} ${l.uf} ${l.id_licitacao} ${l.busca_origem || ""}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [novas, filtroStatus, busca, filtroUsuario, filtroOrigem]);

  const porBuscaOrigem = useMemo(() => {
    const grupos = {};
    novas
      .filter((l) => filtroUsuario === "todos" || l.created_by_id === filtroUsuario || l.usuario_id === filtroUsuario)
      .forEach((l) => {
        const key = l.busca_origem || "Sem origem";
        grupos[key] = (grupos[key] || 0) + 1;
      });
    return grupos;
  }, [novas, filtroUsuario]);

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

  const handleSaveManual = async (licitacao) => {
    await base44.entities.Licitacao.update(licitacao.id, { salva_manualmente: true, favorito: true });
    setNovas((prev) => prev.filter((item) => item.id !== licitacao.id));
  };

  const handleDeleteNova = async (licitacao) => {
    if (!window.confirm(`Excluir "${licitacao.titulo}" da lista?`)) return;
    await base44.entities.Licitacao.delete(licitacao.id);
    setNovas((prev) => prev.filter((l) => l.id !== licitacao.id));
    setSelecionadasNovas((prev) => {
      const nova = new Set(prev);
      nova.delete(licitacao.id_licitacao);
      return nova;
    });
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
    if (!window.confirm(`Excluir ${selecionadasNovas.size} licitação(ões) selecionada(s)?`)) return;
    const ids = itensSelecionadosNovas().map((item) => item.id);
    await base44.entities.Licitacao.deleteMany({ id: { $in: ids } });
    setNovas((prev) => prev.filter((item) => !selecionadasNovas.has(item.id_licitacao)));
    setSelecionadasNovas(new Set());
  };

  const salvarSelecionadasNovas = async () => {
    const itens = itensSelecionadosNovas();
    await base44.entities.Licitacao.bulkUpdate(itens.map((item) => ({ id: item.id, salva_manualmente: true, favorito: true })));
    setNovas((prev) => prev.filter((item) => !selecionadasNovas.has(item.id_licitacao)));
    setSelecionadasNovas(new Set());
  };

  const enviarSelecionadasNovas = () => setCompartilhar(itensSelecionadosNovas());

  const renderActionsNova = (licitacao) => (
    <AtualizacaoActions
      onSend={() => setCompartilhar([licitacao])}
      onSave={() => handleSaveManual(licitacao)}
      onDelete={() => handleDeleteNova(licitacao)}
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
  const [salvandoId, setSalvandoId] = useState(null);
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
    (async () => {
      try {
        const [cachesList, salvasList] = await Promise.all([
          base44.entities.ConsultaCache.list("-updated_date", 500),
          base44.entities.Licitacao.list("-updated_date", 500),
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
    base44.entities.BuscaSalva.list("nome", 100).then((res) => setBuscasSalvasAcervo(toArray(res)));
  }, []);

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
        if (configFiltros.ufs.length && !configFiltros.ufs.includes(l.uf)) return false;
        if (configFiltros.modalidades.length && !configFiltros.modalidades.includes(String(l.id_tipo))) return false;
        if (configFiltros.municipioIbge && l.municipio_IBGE !== configFiltros.municipioIbge) return false;
        if (!combinaComPalavraChave(l, configFiltros.palavraChave, configFiltros.modoPalavras)) return false;
      } else if (filtroModoAcervo === "livre" && filtrosLivrePreenchidos >= 2) {
        if (ufsLivreSelecionadas.length && !ufsLivreSelecionadas.includes(l.uf)) return false;
        if (cidadesLivreSelecionadas.length && !cidadesLivreSelecionadas.includes(l.municipio)) return false;
        if (filtroModalidade && l.tipo !== filtroModalidade) return false;
        if (!combinaComPalavraChave(l, filtroPalavraChaveLivre, filtroModoPalavrasLivre)) return false;
      }
      if (!termo) return true;
      return [l.titulo, l.objeto, l.orgao, l.uf, l.municipio, l.tipo]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo));
    });
  }, [acervo, busca, ufsLivreSelecionadas, cidadesLivreSelecionadas, filtroModalidade, configFiltros, filtroModoAcervo, filtroPalavraChaveLivre, filtroModoPalavrasLivre, filtrosLivrePreenchidos]);

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

  const salvar = async (lic) => {
    setSalvandoId(lic.id_licitacao);
    try {
      await base44.entities.Licitacao.create({
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
        favorito: true,
        salva_manualmente: true,
      });
      setSalvasIds((prev) => new Set(prev).add(lic.id_licitacao));
      base44.functions.invoke("salvarLicitacaoNoBanco", lic).catch(() => {});
    } finally {
      setSalvandoId(null);
    }
  };

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
            Novidades da sincronização automática e o acervo completo já consultado, em um só lugar.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none">{acervo.length}</p>
            <p className="text-xs text-muted-foreground mt-1">no acervo</p>
          </div>
        </div>
      </div>

      {/* Abas + seletor de usuário (persistente entre abas) */}
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
          <button
            onClick={() => setAba("favoritas")}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-l ${aba === "favoritas" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <Star className="w-4 h-4" /> Favoritas
          </button>
        </div>
      </div>

      {aba === "favoritas" ? (
        <FavoritasTab />
      ) : aba === "novas" ? (
        <>
          {/* Painel de sincronização */}
          <div className="bg-card border rounded-xl p-3 sm:p-5 shadow-sm space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-heading font-semibold text-sm sm:text-base">Sincronização automática</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0">
                  {novas.length} licitação(ões) encontradas.
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
            <div className="hidden md:inline-flex items-center border rounded-lg overflow-hidden shrink-0">
              <button
                onClick={() => setModo("cards")}
                title="Visualização em cards"
                className={`p-2 ${modo === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setModo("tabela")}
                title="Visualização em tabela"
                className={`p-2 border-l ${modo === "tabela" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!novasLoading && novasFiltradas.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={novasFiltradas.length > 0 && novasFiltradas.every((item) => selecionadasNovas.has(item.id_licitacao))}
                  onChange={(e) => novasFiltradas.forEach((item) => toggleSelecaoNova(item.id_licitacao, e.target.checked))}
                />
                Selecionar todas
              </label>
              {selecionadasNovas.size > 0 && (
                <AtualizacaoBulkActions
                  quantidade={selecionadasNovas.size}
                  onSend={enviarSelecionadasNovas}
                  onSave={salvarSelecionadasNovas}
                  onDelete={excluirSelecionadasNovas}
                />
              )}
            </div>
          )}

          {novasLoading ? (
            <div className="text-center py-16 text-muted-foreground">Carregando licitações...</div>
          ) : novasFiltradas.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-muted-foreground">Nenhuma licitação encontrada na última sincronização.</p>
              <button onClick={sincronizarAgora} disabled={sincronizando} className="inline-block text-sm text-primary underline">
                Executar sincronização agora →
              </button>
            </div>
          ) : modo === "cards" ? (
            <div className="grid grid-cols-1 gap-4">
              {novasFiltradas.map((l) => (
                <LicitacaoCard
                  key={l.id}
                  licitacao={l}
                  onClick={() => setSelecionada(l)}
                  action={
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={selecionadasNovas.has(l.id_licitacao)}
                          onChange={(e) => toggleSelecaoNova(l.id_licitacao, e.target.checked)}
                        />
                        Selecionar
                      </label>
                      {renderActionsNova(l)}
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <LicitacaoTable
              licitacoes={novasFiltradas}
              onRowClick={setSelecionada}
              selecionados={selecionadasNovas}
              onToggleSelecao={toggleSelecaoNova}
              renderActions={renderActionsNova}
            />
          )}
        </>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por título, órgão, UF, município ou modalidade..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={buscarNaApi}
                disabled={buscandoApi}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                {buscandoApi ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {buscandoApi ? "Buscando..." : "Buscar novas licitações"}
              </button>
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
                <div className="hidden md:inline-flex items-center border rounded-md overflow-hidden">
                  <button
                    onClick={() => setModo("cards")}
                    title="Visualização em cards"
                    className={`p-2.5 ${modo === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setModo("tabela")}
                    title="Visualização em tabela"
                    className={`p-2.5 border-l ${modo === "tabela" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    <Table className="w-4 h-4" />
                  </button>
                </div>
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

          {acervoLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando banco de licitações...
            </div>
          ) : acervoFiltrado.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Nenhuma licitação encontrada ainda. Use "Buscar novas licitações" para popular o acervo.
            </div>
          ) : (
            <>
              {modo === "cards" ? (
                <div className="grid grid-cols-1 gap-4">
                  {paginadas.map((lic) => {
                    const jaSalva = salvasIds.has(lic.id_licitacao);
                    const sel = selecionadosAcervo.has(lic.id_licitacao);
                    return (
                      <div key={lic.id_licitacao} className="relative">
                        <label className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-card/90 backdrop-blur px-2 py-1 rounded-md border text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={(e) => toggleSelecaoAcervo(lic.id_licitacao, e.target.checked)}
                            className="w-3.5 h-3.5 rounded cursor-pointer"
                          />
                        </label>
                        <LicitacaoCard
                          licitacao={lic}
                          onClick={() => setSelecionada(lic)}
                          action={
                            jaSalva ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                <Check className="w-4 h-4" /> Favoritada
                              </span>
                            ) : (
                              <button
                                onClick={() => salvar(lic)}
                                disabled={salvandoId === lic.id_licitacao}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
                              >
                                <Star className="w-3.5 h-3.5" />
                                {salvandoId === lic.id_licitacao ? "Favoritando..." : "Favoritar"}
                              </button>
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <LicitacaoTable
                  licitacoes={paginadas}
                  onRowClick={setSelecionada}
                  selecionados={selecionadosAcervo}
                  onToggleSelecao={toggleSelecaoAcervo}
                />
              )}

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
    </div>
  );
}