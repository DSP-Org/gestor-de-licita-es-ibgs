import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Search, LayoutGrid, Table, Zap, Loader2, Check, AlertCircle, Plus, History, Sparkles } from "lucide-react";
import { STATUS_OPTIONS } from "@/shared/alertaApi";
import LicitacaoCard from "@/components/licitacoes/LicitacaoCard";
import LicitacaoTable from "@/components/licitacoes/LicitacaoTable";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import EmailResultsDialog from "@/components/licitacoes/EmailResultsDialog";
import AtualizacaoActions from "@/components/licitacoes/AtualizacaoActions";
import AtualizacaoBulkActions from "@/components/licitacoes/AtualizacaoBulkActions";
import BuscaMultiSelect from "@/components/buscas/BuscaMultiSelect";
import { toArray } from "@/lib/toArray";

export default function Atualizacao() {
  const [aba, setAba] = useState("novas");
  const [licitacoes, setLicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [selecionada, setSelecionada] = useState(null);
  const [modo, setModo] = useState("cards");
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState(null);
  const [buscasSalvas, setBuscasSalvas] = useState([]);
  const [buscasSelecionadas, setBuscasSelecionadas] = useState([]);
  const [compartilhar, setCompartilhar] = useState(null);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [filtroOrigem, setFiltroOrigem] = useState(null);

  // Histórico — licitações já sincronizadas anteriormente, vindas do banco global
  const [historico, setHistorico] = useState([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoCarregado, setHistoricoCarregado] = useState(false);
  const [historicoSalvasIds, setHistoricoSalvasIds] = useState(new Set());
  const [historicoOwners, setHistoricoOwners] = useState(new Map());
  const [salvandoHistoricoId, setSalvandoHistoricoId] = useState(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const lista = await base44.entities.Licitacao.list("-created_date", 500);
      setLicitacoes(toArray(lista).filter((item) => item.salva_manualmente !== true && item.busca_origem));
    } finally {
      setLoading(false);
    }
  };

  const carregarHistorico = async () => {
    setHistoricoLoading(true);
    try {
      const [cachesList, salvasList] = await Promise.all([
        base44.entities.ConsultaCache.list("-updated_date", 500),
        base44.entities.Licitacao.list("-updated_date", 500),
      ]);
      const mapa = new Map();
      for (const cache of toArray(cachesList)) {
        const lics = toArray(cache.resultado?.licitacoes);
        for (const l of lics) {
          if (l?.id_licitacao && !mapa.has(l.id_licitacao)) mapa.set(l.id_licitacao, l);
        }
      }
      const donosMap = new Map();
      for (const l of toArray(salvasList)) {
        if (l.id_licitacao) donosMap.set(l.id_licitacao, { created_by_id: l.created_by_id, usuario_id: l.usuario_id });
      }
      setHistoricoOwners(donosMap);
      setHistoricoSalvasIds(new Set(toArray(salvasList).map((l) => l.id_licitacao)));
      setHistorico(Array.from(mapa.values()));
    } finally {
      setHistoricoLoading(false);
      setHistoricoCarregado(true);
    }
  };

  useEffect(() => {
    carregar();
    base44.entities.BuscaSalva.filter({ ativa: true }, "nome", 100).then((res) => {
      const lista = toArray(res);
      setBuscasSalvas(lista);
      setBuscasSelecionadas(lista.map((item) => item.id));
    });
    base44.auth.me().then((u) => {
      if (u?.role === "admin") {
        setIsAdmin(true);
        base44.entities.User.list().then((res) => setUsuarios(toArray(res)));
      }
    });
  }, []);

  useEffect(() => {
    if (aba === "historico" && !historicoCarregado) {
      carregarHistorico();
    }
  }, [aba, historicoCarregado]);

  const buscasFiltradas = useMemo(() => {
    if (filtroUsuario === "todos") return buscasSalvas;
    return buscasSalvas.filter((b) => b.created_by_id === filtroUsuario || b.usuario_id === filtroUsuario);
  }, [buscasSalvas, filtroUsuario]);

  useEffect(() => {
    setBuscasSelecionadas(buscasFiltradas.map((b) => b.id));
  }, [buscasFiltradas]);

  const filtradas = useMemo(() => {
    return licitacoes.filter((l) => {
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
  }, [licitacoes, filtroStatus, busca, filtroUsuario, filtroOrigem]);

  const historicoFiltrado = useMemo(() => {
    return historico.filter((l) => {
      if (filtroUsuario !== "todos") {
        const dono = historicoOwners.get(l.id_licitacao);
        if (!dono || (dono.created_by_id !== filtroUsuario && dono.usuario_id !== filtroUsuario)) return false;
      }
      if (busca) {
        const q = busca.toLowerCase();
        const txt = `${l.titulo} ${l.objeto} ${l.orgao} ${l.municipio} ${l.uf} ${l.id_licitacao}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [historico, busca, filtroUsuario, historicoOwners]);

  const sincronizarAgora = async () => {
    setSincronizando(true);
    setResultadoSync(null);
    try {
      const res = await base44.functions.invoke("sincronizarBuscas", { buscaIds: buscasSelecionadas });
      setResultadoSync(res.data || res);
      carregar();
    } catch (e) {
      setResultadoSync({ error: e.message });
    } finally {
      setSincronizando(false);
    }
  };

  const handleSave = async (dados) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = dados;
    if (selecionada?.id) {
      await base44.entities.Licitacao.update(selecionada.id, rest);
    }
    setSelecionada(null);
    carregar();
  };

  const handleSaveManual = async (licitacao) => {
    await base44.entities.Licitacao.update(licitacao.id, { salva_manualmente: true });
    setLicitacoes((prev) => prev.filter((item) => item.id !== licitacao.id));
  };

  const handleDelete = async (licitacao) => {
    if (!window.confirm(`Excluir "${licitacao.titulo}" da lista?`)) return;
    await base44.entities.Licitacao.delete(licitacao.id);
    setLicitacoes((prev) => prev.filter((l) => l.id !== licitacao.id));
    setSelecionadas((prev) => {
      const nova = new Set(prev);
      nova.delete(licitacao.id_licitacao);
      return nova;
    });
  };

  const toggleSelecao = (idLicitacao, marcada) => {
    setSelecionadas((prev) => {
      const nova = new Set(prev);
      marcada ? nova.add(idLicitacao) : nova.delete(idLicitacao);
      return nova;
    });
  };

  const itensSelecionados = () => licitacoes.filter((item) => selecionadas.has(item.id_licitacao));

  const excluirSelecionadas = async () => {
    if (!window.confirm(`Excluir ${selecionadas.size} licitação(ões) selecionada(s)?`)) return;
    const ids = itensSelecionados().map((item) => item.id);
    await base44.entities.Licitacao.deleteMany({ id: { $in: ids } });
    setLicitacoes((prev) => prev.filter((item) => !selecionadas.has(item.id_licitacao)));
    setSelecionadas(new Set());
  };

  const salvarSelecionadas = async () => {
    const itens = itensSelecionados();
    await base44.entities.Licitacao.bulkUpdate(itens.map((item) => ({ id: item.id, salva_manualmente: true })));
    setLicitacoes((prev) => prev.filter((item) => !selecionadas.has(item.id_licitacao)));
    setSelecionadas(new Set());
  };

  const enviarSelecionadas = () => setCompartilhar(itensSelecionados());

  const salvarDoHistorico = async (lic) => {
    setSalvandoHistoricoId(lic.id_licitacao);
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
      setHistoricoSalvasIds((prev) => new Set(prev).add(lic.id_licitacao));
    } finally {
      setSalvandoHistoricoId(null);
    }
  };

  const renderActions = (licitacao) => (
    <AtualizacaoActions
      onSend={() => setCompartilhar([licitacao])}
      onSave={() => handleSaveManual(licitacao)}
      onDelete={() => handleDelete(licitacao)}
    />
  );

  const porBuscaOrigem = useMemo(() => {
    const grupos = {};
    licitacoes
      .filter((l) => filtroUsuario === "todos" || l.created_by_id === filtroUsuario || l.usuario_id === filtroUsuario)
      .forEach((l) => {
        const key = l.busca_origem || "Sem origem";
        grupos[key] = (grupos[key] || 0) + 1;
      });
    return grupos;
  }, [licitacoes, filtroUsuario]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-heading text-xl sm:text-3xl font-bold tracking-tight">Atualização</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Licitações trazidas automaticamente pela sincronização das buscas salvas.</p>
      </div>

      {/* Abas */}
      <div className="inline-flex items-center border rounded-lg overflow-hidden bg-card shadow-sm">
        <button
          onClick={() => setAba("novas")}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium ${aba === "novas" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          <Sparkles className="w-4 h-4" /> Novas
        </button>
        <button
          onClick={() => setAba("historico")}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-l ${aba === "historico" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          <History className="w-4 h-4" /> Histórico
        </button>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 bg-card border rounded-xl p-2 shadow-sm">
          <label className="text-xs font-medium text-muted-foreground pl-1 shrink-0">Usuário:</label>
          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            className="flex-1 sm:flex-none min-w-[10rem] px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="todos">Todos os usuários</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>
        </div>
      )}

      {aba === "novas" && (
        <>
          {/* Painel de sincronização */}
          <div className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-heading font-semibold">Sincronização automática</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {licitacoes.length} licitação(ões) encontradas pela última sincronização.
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
        </>
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
        {aba === "novas" && (
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="flex-1 sm:flex-none min-w-[8.5rem] px-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="todos">Todos os status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}
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

      {aba === "novas" ? (
        <>
          {!loading && filtradas.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filtradas.length > 0 && filtradas.every((item) => selecionadas.has(item.id_licitacao))}
                  onChange={(e) => filtradas.forEach((item) => toggleSelecao(item.id_licitacao, e.target.checked))}
                />
                Selecionar todas
              </label>
              {selecionadas.size > 0 && (
                <AtualizacaoBulkActions
                  quantidade={selecionadas.size}
                  onSend={enviarSelecionadas}
                  onSave={salvarSelecionadas}
                  onDelete={excluirSelecionadas}
                />
              )}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Carregando licitações...</div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-muted-foreground">Nenhuma licitação encontrada na última sincronização.</p>
              <button onClick={sincronizarAgora} disabled={sincronizando} className="inline-block text-sm text-primary underline">
                Executar sincronização agora →
              </button>
            </div>
          ) : modo === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtradas.map((l) => (
                <LicitacaoCard
                  key={l.id}
                  licitacao={l}
                  onClick={() => setSelecionada(l)}
                  action={
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={selecionadas.has(l.id_licitacao)}
                          onChange={(e) => toggleSelecao(l.id_licitacao, e.target.checked)}
                        />
                        Selecionar
                      </label>
                      {renderActions(l)}
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <LicitacaoTable
              licitacoes={filtradas}
              onRowClick={setSelecionada}
              selecionados={selecionadas}
              onToggleSelecao={toggleSelecao}
              renderActions={renderActions}
            />
          )}
        </>
      ) : historicoLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando histórico de sincronizações...
        </div>
      ) : historicoFiltrado.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nenhuma licitação sincronizada anteriormente foi encontrada.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{historicoFiltrado.length}</span> licitação(ões) já sincronizada(s) anteriormente.
          </p>
          {modo === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {historicoFiltrado.map((lic) => {
                const jaSalva = historicoSalvasIds.has(lic.id_licitacao);
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
                          onClick={() => salvarDoHistorico(lic)}
                          disabled={salvandoHistoricoId === lic.id_licitacao}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {salvandoHistoricoId === lic.id_licitacao ? "Salvando..." : "Salvar"}
                        </button>
                      )
                    }
                  />
                );
              })}
            </div>
          ) : (
            <LicitacaoTable licitacoes={historicoFiltrado} onRowClick={setSelecionada} />
          )}
        </>
      )}

      {selecionada && (
        <LicitacaoDetailDialog
          licitacao={selecionada}
          onClose={() => setSelecionada(null)}
          onSave={aba === "novas" ? handleSave : async (dados) => { await salvarDoHistorico(dados); setSelecionada(null); }}
        />
      )}
      {compartilhar?.length > 0 && (
        <EmailResultsDialog
          licitacoes={compartilhar}
          origem={compartilhar.length === 1 ? compartilhar[0].busca_origem : "Licitações selecionadas"}
          onClose={() => setCompartilhar(null)}
        />
      )}
    </div>
  );
}