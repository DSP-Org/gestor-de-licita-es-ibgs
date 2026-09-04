import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Search, Star, FileText, Clock, CheckCircle2, LayoutGrid, Table, Share2,
  Wallet, Plus, Folder, Edit2, Trash2, ChevronRight, Download, GripVertical,
  Bookmark, Layers, Kanban, XCircle, AlertCircle, TrendingUp, Calendar, ArrowRight
} from "lucide-react";
import { STATUS_OPTIONS } from "@/shared/alertaApi";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";
import { escopoUnidade, unidadeEfetiva } from "@/lib/escopoUnidade";
import { toArray } from "@/lib/toArray";
import { parseDataAbertura } from "@/lib/prazosLicitacao";
import { exportarLicitacoesPDF } from "@/lib/exportarLicitacoesPDF";
import { exportarLicitacoesExcel } from "@/lib/exportarLicitacoesExcel";
import LicitacaoCard from "@/components/licitacoes/LicitacaoCard";
import LicitacaoTable from "@/components/licitacoes/LicitacaoTable";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import GestaoRapida from "@/components/licitacoes/GestaoRapida";
import ShareDialog from "@/components/licitacoes/ShareDialog";
import ListaStatsCard from "@/components/licitacoes/ListaStatsCard";
import KanbanFunil from "@/components/licitacoes/KanbanFunil";

const CORES_LISTA = {
  blue: "bg-blue-50 text-blue-600 border-blue-200",
  green: "bg-green-50 text-green-600 border-green-200",
  red: "bg-red-50 text-red-600 border-red-200",
  purple: "bg-purple-50 text-purple-600 border-purple-200",
  yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
  pink: "bg-pink-50 text-pink-600 border-pink-200",
  orange: "bg-orange-50 text-orange-600 border-orange-200",
};

const CORES_LISTA_NOMES = Object.keys(CORES_LISTA);

const ETAPAS_FUNIL = [
  { id: "interessado", label: "Interesse / Triagem", color: "border-blue-300 bg-blue-50/50 text-blue-700", badgeColor: "bg-blue-100 text-blue-800" },
  { id: "acompanhando", label: "Em Análise / Acompanhando", color: "border-amber-300 bg-amber-50/50 text-amber-700", badgeColor: "bg-amber-100 text-amber-800" },
  { id: "participando", label: "Participando / Disputa", color: "border-purple-300 bg-purple-50/50 text-purple-700", badgeColor: "bg-purple-100 text-purple-800" },
  { id: "ganha", label: "Ganha 🎉", color: "border-primary/30 bg-primary/5 text-primary", badgeColor: "bg-primary/10 text-primary" },
  { id: "perdida", label: "Perdida", color: "border-red-300 bg-red-50/50 text-red-700", badgeColor: "bg-red-100 text-red-800" },
];

export default function MinhasLicitacoes() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [listas, setListas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listaSelecionada, setListaSelecionada] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [ocultarPassadas, setOcultarPassadas] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());
  const [busca, setBusca] = useState("");
  const [dataAberturaIni, setDataAberturaIni] = useState("");
  const [dataAberturaFim, setDataAberturaFim] = useState("");
  const [selecionada, setSelecionada] = useState(null);
  const [modo, setModo] = useState("cards"); // "kanban" | "cards" | "tabela"
  const [compartilhar, setCompartilhar] = useState(false);
  const [modalNovaLista, setModalNovaLista] = useState(false);
  const [modalMoverPara, setModalMoverPara] = useState(null);
  const [nomeLista, setNomeLista] = useState("");
  const [corLista, setCorLista] = useState("blue");
  const [editandoLista, setEditandoLista] = useState(null);
  const [compartilharLista, setCompartilharLista] = useState(false);
  const [filtroUF, setFiltroUF] = useState("todos");
  const [filtroPessoa, setFiltroPessoa] = useState("todos");
  const [filtroRapido, setFiltroRapido] = useState("todos");
  const [usuarios, setUsuarios] = useState([]);
  const { isAdmin, filtroUnidade, usuarioLogado } = useUnidadeFilter();

  const carregar = async () => {
    setLoading(true);
    try {
      const [licData, listasData] = await Promise.all([
        base44.entities.Licitacao.filter(
          { favorito: true, oculto: { $ne: true }, ...escopoUnidade(isAdmin, filtroUnidade) },
          "-updated_date",
          500,
        ),
        base44.entities.FavoritaLista.filter(escopoUnidade(isAdmin, filtroUnidade), "ordem", 100)
      ]);
      setLicitacoes(toArray(licData));
      const listasOrdenadas = toArray(listasData).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      setListas(listasOrdenadas);
      try {
        const usersData = await base44.entities.User.list();
        setUsuarios(toArray(usersData));
      } catch { setUsuarios([]); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuarioLogado) {
      carregar();
    }
  }, [usuarioLogado, filtroUnidade, isAdmin]);

  const qtdSemLista = useMemo(() => {
    return licitacoes.filter((l) => !l.lista_favorita_id).length;
  }, [licitacoes]);

  const filtradas = useMemo(() => {
    let resultado = licitacoes;

    if (listaSelecionada === "sem-lista") {
      resultado = resultado.filter((l) => !l.lista_favorita_id);
    } else if (listaSelecionada) {
      resultado = resultado.filter((l) => l.lista_favorita_id === listaSelecionada);
    }

    const hojeSPString = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const hojeZeroHora = new Date(`${hojeSPString}T00:00:00-03:00`);
    const amanha = new Date(hojeZeroHora); amanha.setDate(hojeZeroHora.getDate() + 1);
    const limite3 = new Date(hojeZeroHora); limite3.setDate(hojeZeroHora.getDate() + 3);
    const limite7 = new Date(hojeZeroHora); limite7.setDate(hojeZeroHora.getDate() + 7);
    const semanaAtras = new Date(hojeZeroHora); semanaAtras.setDate(hojeZeroHora.getDate() - 7);

    return resultado.filter((l) => {
      if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
      if (filtroUF !== "todos" && l.uf !== filtroUF) return false;
      if (filtroPessoa !== "todos" && l.usuario_id !== filtroPessoa && l.created_by_id !== filtroPessoa) return false;
      if (ocultarPassadas && (l.abertura_datetime || l.abertura)) {
        const dt = parseDataAbertura(l.abertura_datetime, l.abertura);
        if (dt && dt < hojeZeroHora) return false;
      }
      if (dataAberturaIni || dataAberturaFim) {
        const dataLic = l.abertura_datetime ? l.abertura_datetime.split("T")[0] : (l.abertura ? l.abertura.split("/").reverse().join("-") : "");
        if (!dataLic) return false;
        if (dataAberturaIni && dataLic < dataAberturaIni) return false;
        if (dataAberturaFim && dataLic > dataAberturaFim) return false;
      }
      if (busca) {
        const q = busca.toLowerCase();
        const txt = `${l.titulo} ${l.objeto} ${l.orgao} ${l.municipio} ${l.uf} ${l.id_licitacao}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }

      // Filtros rápidos (cards do painel)
      if (filtroRapido === "abertas") {
        const st = l.status || "interessado";
        if (st === "ganha" || st === "perdida" || st === "descartada") return false;
      } else if (filtroRapido === "novas") {
        const criado = l.created_date ? new Date(l.created_date) : null;
        if (!criado || criado < semanaAtras) return false;
      } else if (filtroRapido === "hoje") {
        const dt = parseDataAbertura(l.abertura_datetime, l.abertura);
        if (!dt || dt < hojeZeroHora || dt >= amanha) return false;
      } else if (filtroRapido === "3dias") {
        const dt = parseDataAbertura(l.abertura_datetime, l.abertura);
        if (!dt || dt < hojeZeroHora || dt > limite3) return false;
      } else if (filtroRapido === "7dias") {
        const dt = parseDataAbertura(l.abertura_datetime, l.abertura);
        if (!dt || dt < hojeZeroHora || dt > limite7) return false;
      }
      return true;
    });
  }, [licitacoes, listaSelecionada, filtroStatus, busca, dataAberturaIni, dataAberturaFim, ocultarPassadas, filtroUF, filtroPessoa, filtroRapido]);

  // Seleção em lote não faz sentido sobreviver a uma troca de filtro/pasta/modo
  // (os itens visíveis mudam por baixo do usuário) — limpa nesses casos.
  useEffect(() => {
    setSelecionados(new Set());
  }, [listaSelecionada, filtroStatus, busca, ocultarPassadas, dataAberturaIni, dataAberturaFim, modo, filtroUF, filtroPessoa, filtroRapido]);

  const toggleSelecao = (idLicitacao, marcado) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (marcado) novo.add(idLicitacao);
      else novo.delete(idLicitacao);
      return novo;
    });
  };

  const licsSelecionadas = () => licitacoes.filter((l) => selecionados.has(l.id_licitacao));

  const handleBulkMoverPara = async (novaListaId) => {
    const alvo = licsSelecionadas();
    if (alvo.length === 0) return;
    try {
      await Promise.all(
        alvo.map((l) =>
          base44.entities.Licitacao.update(l.id, { lista_favorita_id: novaListaId || "", favorito: true })
        )
      );
      setLicitacoes((prev) =>
        prev.map((l) => (selecionados.has(l.id_licitacao) ? { ...l, lista_favorita_id: novaListaId || "" } : l))
      );
    } catch (err) {
      console.error("Erro ao mover selecionadas:", err);
      carregar();
    } finally {
      setSelecionados(new Set());
    }
  };

  const handleBulkMudarStatus = async (novoStatus) => {
    const alvo = licsSelecionadas();
    if (!novoStatus || alvo.length === 0) return;
    setLicitacoes((prev) =>
      prev.map((l) => (selecionados.has(l.id_licitacao) ? { ...l, status: novoStatus } : l))
    );
    try {
      await Promise.all(alvo.map((l) => base44.entities.Licitacao.update(l.id, { status: novoStatus })));
    } catch (err) {
      console.error("Erro ao mudar status em lote:", err);
      carregar();
    } finally {
      setSelecionados(new Set());
    }
  };

  const handleBulkDesfavoritar = async () => {
    const alvo = licsSelecionadas();
    if (alvo.length === 0) return;
    if (!confirm(`Remover ${alvo.length} licitação(ões) selecionada(s) do painel?`)) return;
    try {
      await Promise.all(alvo.map((l) => base44.entities.Licitacao.update(l.id, { favorito: false })));
      setLicitacoes((prev) => prev.filter((l) => !selecionados.has(l.id_licitacao)));
    } catch (err) {
      console.error("Erro ao desfavoritar em lote:", err);
      carregar();
    } finally {
      setSelecionados(new Set());
    }
  };

  // Estatísticas e Funil
  const stats = useMemo(() => {
    const porStatus = {};
    STATUS_OPTIONS.forEach((s) => (porStatus[s.value] = { count: 0, valor: 0 }));
    let valorTotal = 0;
    let valorGanho = 0;
    let valorEmDisputa = 0;

    filtradas.forEach((l) => {
      const val = Number(l.valor) || 0;
      valorTotal += val;
      const st = l.status || "interessado";
      if (!porStatus[st]) porStatus[st] = { count: 0, valor: 0 };
      porStatus[st].count++;
      porStatus[st].valor += val;

      if (st === "ganha") valorGanho += val;
      if (st === "participando" || st === "acompanhando") valorEmDisputa += val;
    });

    const disputadas = (porStatus["ganha"]?.count || 0) + (porStatus["perdida"]?.count || 0);
    const taxaConversao = disputadas > 0 ? Math.round(((porStatus["ganha"]?.count || 0) / disputadas) * 100) : 0;

    return {
      valorTotal,
      valorGanho,
      valorEmDisputa,
      taxaConversao,
      total: filtradas.length,
      porStatus,
    };
  }, [filtradas]);

  // Cards do Painel — prazos de abertura e novidades da semana
  const painelStats = useMemo(() => {
    const hojeSP = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const agora = new Date(`${hojeSP}T00:00:00-03:00`);
    const amanha = new Date(agora); amanha.setDate(agora.getDate() + 1);
    const limite3 = new Date(agora); limite3.setDate(agora.getDate() + 3);
    const limite7 = new Date(agora); limite7.setDate(agora.getDate() + 7);
    const semanaAtras = new Date(agora); semanaAtras.setDate(agora.getDate() - 7);

    let novasSemana = 0;
    let totalEmAberto = 0;
    let abreHoje = 0;
    let ab3dias = 0;
    let ab7dias = 0;

    filtradas.forEach((l) => {
      const st = l.status || "interessado";
      if (st !== "ganha" && st !== "perdida" && st !== "descartada") totalEmAberto++;

      const criado = l.created_date ? new Date(l.created_date) : null;
      if (criado && criado >= semanaAtras) novasSemana++;

      const dt = parseDataAbertura(l.abertura_datetime, l.abertura);
      if (!dt) return;
      if (dt >= agora && dt < amanha) abreHoje++;
      if (dt >= agora && dt <= limite3) ab3dias++;
      if (dt >= agora && dt <= limite7) ab7dias++;
    });

    return { novasSemana, totalEmAberto, abreHoje, ab3dias, ab7dias };
  }, [filtradas]);

  const ufsDisponiveis = useMemo(() => {
    const set = new Set(licitacoes.map((l) => l.uf).filter(Boolean));
    return Array.from(set).sort();
  }, [licitacoes]);

  const usuariosComLicitacoes = useMemo(() => {
    const ids = new Set(licitacoes.map((l) => l.usuario_id || l.created_by_id).filter(Boolean));
    return usuarios.filter((u) => ids.has(u.id));
  }, [licitacoes, usuarios]);

  const handleSave = async (dados) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = dados;
    await base44.entities.Licitacao.update(selecionada.id, rest);
    setSelecionada(null);
    carregar();
  };

  const handleRemoverFavorito = async (licitacao) => {
    await base44.entities.Licitacao.update(licitacao.id, { favorito: false });
    setLicitacoes((prev) => prev.filter((l) => l.id !== licitacao.id));
  };

  const handleMudarStatus = async (licId, novoStatus) => {
    setLicitacoes((prev) => prev.map((l) => (l.id === licId ? { ...l, status: novoStatus } : l)));
    try {
      await base44.entities.Licitacao.update(licId, { status: novoStatus });
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
      carregar();
    }
  };

  const handleCriarLista = async () => {
    if (!nomeLista.trim()) return;
    try {
      await base44.entities.FavoritaLista.create({
        nome: nomeLista,
        cor: corLista,
        ordem: listas.length,
        unidade_negocio_id: unidadeEfetiva(isAdmin, filtroUnidade, usuarioLogado),
      });
      setNomeLista("");
      setCorLista("blue");
      setModalNovaLista(false);
      carregar();
    } catch (err) {
      console.error("Erro ao criar lista:", err);
    }
  };

  const handleAtualizarLista = async () => {
    if (!nomeLista.trim() || !editandoLista) return;
    try {
      await base44.entities.FavoritaLista.update(editandoLista.id, {
        nome: nomeLista,
        cor: corLista
      });
      setNomeLista("");
      setCorLista("blue");
      setEditandoLista(null);
      carregar();
    } catch (err) {
      console.error("Erro ao atualizar lista:", err);
    }
  };

  const handleDeletarLista = async (listaId) => {
    if (!confirm("Tem certeza que quer deletar esta lista? As licitações continuarão em Minhas Licitações (sem lista).")) return;
    try {
      await base44.entities.FavoritaLista.delete(listaId);
      if (listaSelecionada === listaId) {
        setListaSelecionada(null);
      }
      carregar();
    } catch (err) {
      console.error("Erro ao deletar lista:", err);
    }
  };

  const handleMoverPara = async (novaListaId) => {
    if (!modalMoverPara) return;
    try {
      await base44.entities.Licitacao.update(modalMoverPara.id, {
        lista_favorita_id: novaListaId || "",
        favorito: true
      });
      setLicitacoes((prev) =>
        prev.map((l) => (l.id === modalMoverPara.id ? { ...l, lista_favorita_id: novaListaId || "" } : l))
      );
      setModalMoverPara(null);
    } catch (err) {
      console.error("Erro ao mover licitação:", err);
    }
  };

  const handleDragDropListas = async (result) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;

    const novasListas = Array.from(listas);
    const [movido] = novasListas.splice(source.index, 1);
    novasListas.splice(destination.index, 0, movido);
    setListas(novasListas);

    try {
      for (let i = 0; i < novasListas.length; i++) {
        await base44.entities.FavoritaLista.update(novasListas[i].id, { ordem: i });
      }
    } catch (err) {
      console.error("Erro ao reordenar listas:", err);
      carregar();
    }
  };

  const handleExportarLista = (formato) => {
    const licAtual = filtradas;
    if (licAtual.length === 0) {
      alert("Nenhuma licitação para exportar nesta visão.");
      return;
    }

    const tituloExport = listaAtual ? `Licitações — ${listaAtual.nome}` : listaSelecionada === "sem-lista" ? "Licitações — Sem Lista" : "Minhas Licitações — Todas";

    if (formato === "pdf") {
      exportarLicitacoesPDF(licAtual, tituloExport);
    } else if (formato === "excel") {
      exportarLicitacoesExcel(licAtual, `minhas-licitacoes-${(listaAtual?.nome || listaSelecionada || "todas").toLowerCase().replace(/\s+/g, "-")}`);
    }
  };

  const listaAtual = listas.find((l) => l.id === listaSelecionada);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
            <Bookmark className="w-6 h-6 text-primary" /> Painel de Acompanhamento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão estratégica das suas oportunidades favoritadas, pipeline de disputas e resultados.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleExportarLista("pdf")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg hover:bg-muted bg-card shadow-sm"
            title="Exportar em PDF"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={() => handleExportarLista("excel")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg hover:bg-muted bg-card shadow-sm"
            title="Exportar em Excel"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
        </div>
      </div>

      {/* Cards do Painel — prazos e novidades (clicáveis = filtros rápidos) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          icon={Bookmark}
          label="Total em Aberto"
          value={painelStats.totalEmAberto}
          color="bg-primary/10 text-primary"
          active={filtroRapido === "abertas"}
          onClick={() => setFiltroRapido(filtroRapido === "abertas" ? "todos" : "abertas")}
        />
        <StatCard
          icon={Calendar}
          label="Novas da Semana"
          value={painelStats.novasSemana}
          color="bg-status-blue/10 text-status-blue"
          active={filtroRapido === "novas"}
          onClick={() => setFiltroRapido(filtroRapido === "novas" ? "todos" : "novas")}
        />
        <StatCard
          icon={Clock}
          label="Abre Hoje"
          value={painelStats.abreHoje}
          color="bg-destructive/10 text-destructive"
          active={filtroRapido === "hoje"}
          onClick={() => setFiltroRapido(filtroRapido === "hoje" ? "todos" : "hoje")}
        />
        <StatCard
          icon={AlertCircle}
          label="Abre em 3 dias"
          value={painelStats.ab3dias}
          color="bg-status-amber/10 text-status-amber"
          active={filtroRapido === "3dias"}
          onClick={() => setFiltroRapido(filtroRapido === "3dias" ? "todos" : "3dias")}
        />
        <StatCard
          icon={Calendar}
          label="Abre em 7 dias"
          value={painelStats.ab7dias}
          color="bg-purple-50 text-purple-600 dark:bg-purple-950/40"
          active={filtroRapido === "7dias"}
          onClick={() => setFiltroRapido(filtroRapido === "7dias" ? "todos" : "7dias")}
        />
      </div>

      {/* Seção de Listas & Pastas de Organização */}
      <div className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Folder className="w-4 h-4 text-primary" />
            Minhas Pastas & Listas
          </h3>
          <button
            onClick={() => {
              setNomeLista("");
              setCorLista("blue");
              setEditandoLista(null);
              setModalNovaLista(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Lista
          </button>
        </div>

        {/* Filtro Rápido */}
        <div className="flex flex-wrap gap-2 pt-1 border-t">
          <button
            onClick={() => setListaSelecionada(null)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              listaSelecionada === null
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                : "border-muted hover:border-foreground bg-background text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Todas as Pastas ({licitacoes.length})
          </button>

          <button
            onClick={() => setListaSelecionada("sem-lista")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              listaSelecionada === "sem-lista"
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                : "border-muted hover:border-foreground bg-background text-foreground"
            }`}
          >
            <Star className="w-3.5 h-3.5 text-status-amber fill-status-amber" />
            Sem Pasta ({qtdSemLista})
          </button>
        </div>

        {/* Listas Personalizadas */}
        {listas.length > 0 && (
          <DragDropContext onDragEnd={handleDragDropListas}>
            <Droppable droppableId="listas" direction="horizontal">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-wrap gap-2 pt-2 ${snapshot.isDraggingOver ? "bg-muted/30 rounded-lg p-2" : ""}`}
                >
                  {listas.map((lista, index) => (
                    <Draggable key={lista.id} draggableId={lista.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                            listaSelecionada === lista.id
                              ? `${CORES_LISTA[lista.cor || "blue"]} border-current font-bold shadow-sm ring-1 ring-primary/30`
                              : "border-muted hover:border-foreground bg-background"
                          } ${snapshot.isDragging ? "shadow-lg scale-105 bg-background" : ""}`}
                          onClick={() => setListaSelecionada(lista.id)}
                        >
                          <div {...provided.dragHandleProps} className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <span className="text-xs">
                            {lista.nome}
                            <span className="text-[11px] ml-1.5 opacity-70">
                              ({licitacoes.filter((l) => l.lista_favorita_id === lista.id).length})
                            </span>
                          </span>

                          <div className="flex items-center gap-0.5 ml-1">
                            {listaSelecionada === lista.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCompartilharLista(true);
                                }}
                                className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                                title="Compartilhar lista"
                              >
                                <Share2 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNomeLista(lista.nome);
                                setCorLista(lista.cor || "blue");
                                setEditandoLista(lista);
                                setModalNovaLista(true);
                              }}
                              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                              title="Editar lista"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletarLista(lista.id);
                              }}
                              className="p-1 hover:bg-destructive/10 text-destructive rounded"
                              title="Deletar lista"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Detalhes e Maiores Oportunidades da Lista */}
      {listaAtual && filtradas.length > 0 && (
        <ListaStatsCard licitacoes={filtradas} lista={listaAtual} />
      )}

      {/* Barra de Filtros e Modos de Visualização */}
      <div className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por título, objeto, órgão, município..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="flex-1 sm:flex-none min-w-0 px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="todos">Todos os status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              value={filtroUF}
              onChange={(e) => setFiltroUF(e.target.value)}
              className="flex-1 sm:flex-none min-w-0 px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="todos">Todos os estados</option>
              {ufsDisponiveis.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>

            <select
              value={filtroPessoa}
              onChange={(e) => setFiltroPessoa(e.target.value)}
              className="flex-1 sm:flex-none min-w-0 px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="todos">Todas as pessoas</option>
              {usuariosComLicitacoes.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>

            {/* Alternador de visualizações — oculto no mobile (sempre cards) */}
            <div className="hidden sm:flex items-center gap-1 border rounded-lg p-1 bg-background shrink-0">
              <button
                onClick={() => setModo("cards")}
                className={`p-1.5 rounded transition-all ${
                  modo === "cards" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setModo("tabela")}
                className={`p-1.5 rounded transition-all ${
                  modo === "tabela" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visualização em Tabela"
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Range de Datas e Filtros Avançados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t text-xs items-end">
          <div>
            <label className="font-medium text-muted-foreground block mb-1">Abertura a partir de</label>
            <input
              type="date"
              min={new Date().toLocaleDateString("en-CA")}
              value={dataAberturaIni}
              onChange={(e) => setDataAberturaIni(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="font-medium text-muted-foreground block mb-1">Abertura até</label>
            <input
              type="date"
              min={dataAberturaIni || new Date().toLocaleDateString("en-CA")}
              value={dataAberturaFim}
              onChange={(e) => setDataAberturaFim(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center sm:justify-end pb-1.5">
            <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground select-none">
              <input
                type="checkbox"
                checked={ocultarPassadas}
                onChange={(e) => setOcultarPassadas(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <span>Ocultar disputas passadas</span>
            </label>
          </div>
        </div>
      </div>

      {/* Barra de Ações em Lote — só faz sentido em Cards/Tabela; o Kanban já resolve status via drag & drop */}
      {!loading && filtradas.length > 0 && (
        <div className="bg-card border rounded-xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selecionados.size > 0 && selecionados.size === filtradas.length}
              onChange={(e) =>
                setSelecionados(e.target.checked ? new Set(filtradas.map((l) => l.id_licitacao)) : new Set())
              }
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span>{selecionados.size > 0 ? `${selecionados.size} selecionada(s)` : "Selecionar todas"}</span>
          </label>

          {selecionados.size > 0 && (
            <>
              <div className="h-4 w-px bg-border hidden sm:block" />

              <select
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  handleBulkMoverPara(e.target.value === "sem-lista" ? null : e.target.value);
                  e.target.value = "";
                }}
                className="text-xs px-2.5 py-1.5 border rounded-lg bg-background cursor-pointer"
              >
                <option value="" disabled>Mover para pasta...</option>
                <option value="sem-lista">⭐ Sem Lista</option>
                {listas.map((lista) => (
                  <option key={lista.id} value={lista.id}>📁 {lista.nome}</option>
                ))}
              </select>

              <select
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  handleBulkMudarStatus(e.target.value);
                  e.target.value = "";
                }}
                className="text-xs px-2.5 py-1.5 border rounded-lg bg-background cursor-pointer"
              >
                <option value="" disabled>Mudar status...</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              <button
                onClick={handleBulkDesfavoritar}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border hover:bg-destructive/5 hover:text-destructive text-muted-foreground"
              >
                <Trash2 className="w-3.5 h-3.5" /> Desfavoritar selecionadas
              </button>

              <button
                onClick={() => setSelecionados(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                Limpar seleção
              </button>
            </>
          )}
        </div>
      )}

      {/* Conteúdo Principal do Painel */}
      {loading ? (
        <div className="text-center py-24 text-muted-foreground">Carregando painel de acompanhamento...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 bg-card border rounded-2xl p-8 space-y-4 shadow-sm">
          <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h3 className="font-semibold text-lg">Nenhuma licitação encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {busca || filtroStatus !== "todos" || listaSelecionada || ocultarPassadas || dataAberturaIni || dataAberturaFim || filtroUF !== "todos" || filtroPessoa !== "todos" || filtroRapido !== "todos"
              ? "Tente ajustar os filtros ou a pasta selecionada."
              : "Favorite licitações no banco inicial para acompanhá-las em seu funil de disputas."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {(busca || filtroStatus !== "todos" || listaSelecionada || ocultarPassadas || dataAberturaIni || dataAberturaFim || filtroUF !== "todos" || filtroPessoa !== "todos" || filtroRapido !== "todos") ? (
              <button
                onClick={() => {
                  setBusca("");
                  setFiltroStatus("todos");
                  setListaSelecionada(null);
                  setOcultarPassadas(false);
                  setDataAberturaIni("");
                  setDataAberturaFim("");
                  setFiltroUF("todos");
                  setFiltroPessoa("todos");
                  setFiltroRapido("todos");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border rounded-lg hover:bg-muted"
              >
                Limpar Todos os Filtros
              </button>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 shadow-sm"
              >
                <Search className="w-3.5 h-3.5" /> Explorar Banco de Licitações
              </Link>
            )}
          </div>
        </div>
      ) : modo === "cards" ? (
        /* VISUALIZAÇÃO EM CARDS COM GESTÃO RÁPIDA EMBUTIDA */
        <div className="space-y-3">
          {filtradas.map((lic) => (
            <div key={lic.id} className="relative group">
              <LicitacaoCard
                licitacao={lic}
                onClick={() => setSelecionada(lic)}
                selecionado={selecionados.has(lic.id_licitacao)}
                onToggleSelecao={toggleSelecao}
                gestao={
                  <GestaoRapida
                    licitacao={lic}
                    listas={listas}
                    onUpdated={(id, campo, valor) =>
                      setLicitacoes((prev) => prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)))
                    }
                  />
                }
                action={
                  <div className="flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalMoverPara(lic);
                      }}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border hover:bg-muted text-muted-foreground"
                    >
                      <Folder className="w-3 h-3" /> Mover de Lista
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoverFavorito(lic);
                      }}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border hover:bg-red-50 hover:text-red-600 text-muted-foreground"
                    >
                      <Trash2 className="w-3 h-3" /> Remover
                    </button>
                  </div>
                }
              />
            </div>
          ))}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM TABELA */
        <LicitacaoTable
          licitacoes={filtradas}
          onRowClick={(lic) => setSelecionada(lic)}
          selecionados={selecionados}
          onToggleSelecao={toggleSelecao}
          action={(lic) => (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setModalMoverPara(lic)}
                className="p-1 hover:bg-muted rounded text-muted-foreground"
                title="Mover de lista"
              >
                <Folder className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRemoverFavorito(lic)}
                className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-amber-500"
                title="Remover"
              >
                <Star className="w-4 h-4 fill-amber-400" />
              </button>
            </div>
          )}
        />
      )}

      {/* Modal Detalhes com Notas e Proposta */}
      {selecionada && (
        <LicitacaoDetailDialog
          licitacao={selecionada}
          onClose={() => setSelecionada(null)}
          onSave={handleSave}
        />
      )}

      {/* Modal Criar / Editar Lista */}
      {modalNovaLista && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl animate-in fade-in zoom-in duration-150">
            <h2 className="font-semibold text-lg">{editandoLista ? "Editar Lista" : "Nova Lista"}</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Nome da lista *</label>
              <input
                type="text"
                placeholder="Ex: TI e Software, Reformas 2026..."
                value={nomeLista}
                onChange={(e) => setNomeLista(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Cor da identificação</label>
              <div className="flex flex-wrap gap-2">
                {CORES_LISTA_NOMES.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setCorLista(cor)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${CORES_LISTA[cor]} ${
                      corLista === cor ? "ring-2 ring-primary scale-110" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <button
                onClick={() => setModalNovaLista(false)}
                className="px-3.5 py-2 border rounded-lg hover:bg-muted text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={editandoLista ? handleAtualizarLista : handleCriarLista}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-medium"
              >
                {editandoLista ? "Salvar Alterações" : "Criar Lista"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mover Para Lista */}
      {modalMoverPara && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl animate-in fade-in zoom-in duration-150">
            <h2 className="font-semibold text-lg">Mover para Lista</h2>
            <p className="text-xs text-muted-foreground line-clamp-2">{modalMoverPara.titulo}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => handleMoverPara(null)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted text-sm border"
              >
                ⭐ Sem Lista (Apenas salva no painel)
              </button>
              {listas.map((lista) => (
                <button
                  key={lista.id}
                  onClick={() => handleMoverPara(lista.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border font-medium transition-all ${CORES_LISTA[lista.cor || "blue"]}`}
                >
                  📁 {lista.nome}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <button
                onClick={() => setModalMoverPara(null)}
                className="px-3 py-2 border rounded-lg hover:bg-muted text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compartilhar Lista */}
      {compartilharLista && listaAtual && (
        <ShareDialog
          licitacoes={filtradas}
          titulo={listaAtual.nome}
          onClose={() => setCompartilharLista(false)}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-card border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shadow-sm transition-all text-left ${
        active
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-border hover:shadow-md hover:border-primary/30"
      }`}
    >
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs text-muted-foreground truncate leading-tight">{label}</p>
        <p className="text-base sm:text-xl font-bold leading-tight mt-0.5">{value}</p>
      </div>
    </button>
  );
}

function formatarMoeda(valor) {
  if (!valor || valor === 0) return "R$ 0";
  if (valor >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
  }
  if (valor >= 1_000) {
    return `R$ ${(valor / 1_000).toFixed(0)}K`;
  }
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}