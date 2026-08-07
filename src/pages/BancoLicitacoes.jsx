import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, Check, Loader2, Database, LayoutGrid, Table, ChevronLeft, ChevronRight, FileDown, Sheet } from "lucide-react";
import LicitacaoCard from "@/components/licitacoes/LicitacaoCard";
import LicitacaoTable from "@/components/licitacoes/LicitacaoTable";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import { toArray } from "@/lib/toArray";
import { UFS } from "@/shared/alertaApi";
import { exportarLicitacoesPDF } from "@/lib/exportarLicitacoesPDF";
import { exportarLicitacoesExcel } from "@/lib/exportarLicitacoesExcel";

export default function BancoLicitacoes() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroUf, setFiltroUf] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState("");
  const [buscasSalvas, setBuscasSalvas] = useState([]);
  const [filtroBuscaId, setFiltroBuscaId] = useState("");
  const [modo, setModo] = useState("cards");
  const [salvasIds, setSalvasIds] = useState(new Set());
  const [salvandoId, setSalvandoId] = useState(null);
  const [selecionada, setSelecionada] = useState(null);
  const [pagina, setPagina] = useState(1);
  const porPagina = 30;

  useEffect(() => {
    (async () => {
      try {
        const [cachesList, salvasList] = await Promise.all([
          base44.entities.ConsultaCache.list("-updated_date", 500),
          base44.entities.Licitacao.list("-updated_date", 500),
        ]);
        setSalvasIds(new Set(toArray(salvasList).map((l) => l.id_licitacao)));

        // Consolida todas as licitações já consultadas por qualquer usuário,
        // removendo duplicatas (mesma licitação pode aparecer em várias buscas).
        const mapa = new Map();
        for (const cache of toArray(cachesList)) {
          const lics = toArray(cache.resultado?.licitacoes);
          for (const l of lics) {
            if (l?.id_licitacao && !mapa.has(l.id_licitacao)) {
              mapa.set(l.id_licitacao, l);
            }
          }
        }
        setLicitacoes(Array.from(mapa.values()));
      } catch (e) {
        setErro(e.message || "Erro ao carregar o banco de licitações.");
      } finally {
        setLoading(false);
      }
    })();
    base44.entities.BuscaSalva.list("nome", 100).then((res) => setBuscasSalvas(toArray(res)));
  }, []);

  const buscaSelecionada = useMemo(
    () => buscasSalvas.find((b) => b.id === filtroBuscaId) || null,
    [buscasSalvas, filtroBuscaId]
  );

  const configFiltros = useMemo(() => {
    if (!buscaSelecionada) return null;
    return {
      ufs: (buscaSelecionada.uf || "").split(",").map((s) => s.trim()).filter(Boolean),
      modalidades: (buscaSelecionada.modalidade || "").split(",").map((s) => s.trim()).filter(Boolean),
      municipioIbge: buscaSelecionada.municipio_ibge || "",
    };
  }, [buscaSelecionada]);

  const cidadesDisponiveis = useMemo(() => {
    const base = filtroUf ? licitacoes.filter((l) => l.uf === filtroUf) : licitacoes;
    return Array.from(new Set(base.map((l) => l.municipio).filter(Boolean))).sort();
  }, [licitacoes, filtroUf]);

  const modalidadesDisponiveis = useMemo(() => {
    return Array.from(new Set(licitacoes.map((l) => l.tipo).filter(Boolean))).sort();
  }, [licitacoes]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return licitacoes.filter((l) => {
      if (configFiltros) {
        if (configFiltros.ufs.length && !configFiltros.ufs.includes(l.uf)) return false;
        if (configFiltros.modalidades.length && !configFiltros.modalidades.includes(String(l.id_tipo))) return false;
        if (configFiltros.municipioIbge && l.municipio_IBGE !== configFiltros.municipioIbge) return false;
      } else {
        if (filtroUf && l.uf !== filtroUf) return false;
        if (filtroCidade && l.municipio !== filtroCidade) return false;
        if (filtroModalidade && l.tipo !== filtroModalidade) return false;
      }
      if (!termo) return true;
      return [l.titulo, l.objeto, l.orgao, l.uf, l.municipio, l.tipo]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo));
    });
  }, [licitacoes, busca, filtroUf, filtroCidade, filtroModalidade, configFiltros]);

  useEffect(() => {
    setPagina(1);
  }, [busca, filtroUf, filtroCidade, filtroModalidade, filtroBuscaId]);

  useEffect(() => {
    setFiltroCidade("");
  }, [filtroUf]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginadas = useMemo(
    () => filtradas.slice((pagina - 1) * porPagina, pagina * porPagina),
    [filtradas, pagina]
  );

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
        favorito: false,
        salva_manualmente: true,
      });
      setSalvasIds((prev) => new Set(prev).add(lic.id_licitacao));
      // Reforça a permanência da licitação no banco compartilhado.
      base44.functions.invoke("salvarLicitacaoNoBanco", lic).catch(() => {});
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Database className="w-5 h-5" /> Banco de Licitação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as licitações já consultadas por qualquer usuário, reunidas em um único lugar.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none">{licitacoes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">no banco</p>
          </div>
        </div>
      </div>

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

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
            <select
              value={filtroBuscaId}
              onChange={(e) => setFiltroBuscaId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Filtrar por configuração salva...</option>
              {buscasSalvas.map((b) => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
            <select
              value={filtroUf}
              onChange={(e) => setFiltroUf(e.target.value)}
              disabled={!!configFiltros}
              className="w-full px-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">Todos os estados</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
            <select
              value={filtroCidade}
              onChange={(e) => setFiltroCidade(e.target.value)}
              disabled={!!configFiltros}
              className="w-full px-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">Todas as cidades</option>
              {cidadesDisponiveis.map((cidade) => (
                <option key={cidade} value={cidade}>{cidade}</option>
              ))}
            </select>
            <select
              value={filtroModalidade}
              onChange={(e) => setFiltroModalidade(e.target.value)}
              disabled={!!configFiltros}
              className="w-full px-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">Todas as modalidades</option>
              {modalidadesDisponiveis.map((modalidade) => (
                <option key={modalidade} value={modalidade}>{modalidade}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
              onClick={() => exportarLicitacoesPDF(filtradas, "Banco de Licitação")}
              disabled={filtradas.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50 shrink-0"
            >
              <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => exportarLicitacoesExcel(filtradas, "banco-licitacoes")}
              disabled={filtradas.length === 0}
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando banco de licitações...
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nenhuma licitação encontrada ainda. Faça buscas em "Explorar" para popular o banco.
        </div>
      ) : (
        <>
          {modo === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginadas.map((lic) => {
                const jaSalva = salvasIds.has(lic.id_licitacao);
                return (
                  <LicitacaoCard
                    key={lic.id_licitacao}
                    licitacao={lic}
                    onClick={() => setSelecionada(lic)}
                    action={
                      jaSalva ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                          <Check className="w-4 h-4" /> Salva
                        </span>
                      ) : (
                        <button
                          onClick={() => salvar(lic)}
                          disabled={salvandoId === lic.id_licitacao}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {salvandoId === lic.id_licitacao ? "Salvando..." : "Salvar"}
                        </button>
                      )
                    }
                  />
                );
              })}
            </div>
          ) : (
            <LicitacaoTable licitacoes={paginadas} onRowClick={setSelecionada} />
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

      {selecionada && (
        <LicitacaoDetailDialog
          licitacao={selecionada}
          onClose={() => setSelecionada(null)}
          onSave={async (dados) => {
            await salvar(dados);
            setSelecionada(null);
          }}
        />
      )}
    </div>
  );
}