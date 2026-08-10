import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Star, FileText, Clock, CheckCircle2, LayoutGrid, Table, Share2, Wallet, Plus, Folder, Edit2, Trash2, ChevronRight } from "lucide-react";
import { STATUS_OPTIONS } from "@/shared/alertaApi";
import { toArray } from "@/lib/toArray";
import LicitacaoCard from "@/components/licitacoes/LicitacaoCard";
import LicitacaoTable from "@/components/licitacoes/LicitacaoTable";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import ShareDialog from "@/components/licitacoes/ShareDialog";

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

export default function FavoritasTab() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [listas, setListas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listaSelecionada, setListaSelecionada] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [dataAberturaIni, setDataAberturaIni] = useState("");
  const [dataAberturaFim, setDataAberturaFim] = useState("");
  const [selecionada, setSelecionada] = useState(null);
  const [modo, setModo] = useState("cards");
  const [compartilhar, setCompartilhar] = useState(false);
  const [modalNovaLista, setModalNovaLista] = useState(false);
  const [modalMoverPara, setModalMoverPara] = useState(null);
  const [nomeLista, setNomeLista] = useState("");
  const [corLista, setCorLista] = useState("blue");
  const [editandoLista, setEditandoLista] = useState(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [licData, listasData] = await Promise.all([
        base44.entities.Licitacao.filter({ favorito: true }, "-updated_date", 500),
        base44.entities.FavoritaLista.list("ordem", 100)
      ]);
      setLicitacoes(toArray(licData));
      const listasOrdenadas = toArray(listasData).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      setListas(listasOrdenadas);
      if (listasOrdenadas.length > 0 && !listaSelecionada) {
        setListaSelecionada(listasOrdenadas[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = useMemo(() => {
    let resultado = licitacoes;

    if (listaSelecionada) {
      resultado = resultado.filter((l) => l.lista_favorita_id === listaSelecionada);
    }

    return resultado.filter((l) => {
      if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
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
      return true;
    });
  }, [licitacoes, listaSelecionada, filtroStatus, busca, dataAberturaIni, dataAberturaFim]);

  const stats = useMemo(() => {
    const porStatus = {};
    STATUS_OPTIONS.forEach((s) => (porStatus[s.value] = 0));
    filtradas.forEach((l) => {
      if (porStatus[l.status] !== undefined) porStatus[l.status]++;
    });
    const valorTotal = filtradas.reduce((soma, l) => soma + (Number(l.valor) || 0), 0);
    return {
      valorTotal,
      total: filtradas.length,
      ganhas: porStatus.ganha,
      acompanhando: porStatus.acompanhando + porStatus.participando,
    };
  }, [filtradas]);

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

  const handleCriarLista = async () => {
    if (!nomeLista.trim()) return;
    try {
      await base44.entities.FavoritaLista.create({
        nome: nomeLista,
        cor: corLista,
        ordem: listas.length
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
    if (!confirm("Tem certeza que quer deletar esta lista? As licitações continuarão favoritadas.")) return;
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
        lista_favorita_id: novaListaId || null
      });
      setModalMoverPara(null);
      carregar();
    } catch (err) {
      console.error("Erro ao mover licitação:", err);
    }
  };

  const listaAtual = listas.find((l) => l.id === listaSelecionada);

  return (
    <div className="space-y-5">
      {/* Seção de Listas */}
      <div className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Minhas Listas de Favoritos
          </h3>
          <button
            onClick={() => {
              setNomeLista("");
              setCorLista("blue");
              setEditandoLista(null);
              setModalNovaLista(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs border rounded-lg hover:bg-muted"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Lista
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {listas.length === 0 ? (
            <p className="text-xs text-muted-foreground w-full">Nenhuma lista criada. Crie a primeira!</p>
          ) : (
            listas.map((lista) => (
              <div
                key={lista.id}
                onClick={() => setListaSelecionada(lista.id)}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                  listaSelecionada === lista.id
                    ? `${CORES_LISTA[lista.cor || "blue"]} border-current font-semibold`
                    : "border-muted hover:border-foreground"
                }`}
              >
                <span className="text-sm">
                  {lista.nome}
                  <span className="text-xs ml-1.5 opacity-60">
                    ({licitacoes.filter((l) => l.lista_favorita_id === lista.id).length})
                  </span>
                </span>
                <div className="flex items-center gap-1">
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
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded"
                    title="Deletar lista"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Valor total das licitações favoritadas</p>
          <p className="text-2xl sm:text-3xl font-bold leading-tight truncate">
            {stats.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={FileText} label="Total" value={stats.total} color="text-blue-600 bg-blue-50" />
        <StatCard icon={Clock} label="Acompanhando" value={stats.acompanhando} color="text-purple-600 bg-purple-50" />
        <StatCard icon={CheckCircle2} label="Ganhas" value={stats.ganhas} color="text-green-600 bg-green-50" />
      </div>

      <div className="flex flex-col gap-2 bg-card border rounded-xl p-2.5 sm:p-2 shadow-sm">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, órgão, objeto..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="date"
              value={dataAberturaIni}
              onChange={(e) => setDataAberturaIni(e.target.value)}
              title="Data de abertura inicial"
              className="px-2 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-muted-foreground text-xs">até</span>
            <input
              type="date"
              value={dataAberturaFim}
              onChange={(e) => setDataAberturaFim(e.target.value)}
              title="Data de abertura final"
              className="px-2 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
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
          {(dataAberturaIni || dataAberturaFim) && (
            <button
              onClick={() => { setDataAberturaIni(""); setDataAberturaFim(""); }}
              className="text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              Limpar data
            </button>
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
          <button
            onClick={() => setCompartilhar(true)}
            disabled={filtradas.length === 0}
            title="Compartilhar licitações"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-lg shrink-0 hover:bg-muted disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando favoritas...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Nenhuma licitação favoritada ainda.</div>
      ) : modo === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map((l) => (
            <LicitacaoCard
              key={l.id}
              licitacao={l}
              onClick={() => setSelecionada(l)}
              action={
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setModalMoverPara(l)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <ChevronRight className="w-3.5 h-3.5" /> Mover para lista
                  </button>
                  <button
                    onClick={() => handleRemoverFavorito(l)}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-muted-foreground"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Remover dos favoritos
                  </button>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <LicitacaoTable licitacoes={filtradas} onRowClick={setSelecionada} onDelete={handleRemoverFavorito} />
      )}

      {selecionada && (
        <LicitacaoDetailDialog licitacao={selecionada} onClose={() => setSelecionada(null)} onSave={handleSave} />
      )}

      {compartilhar && (
        <ShareDialog
          licitacoes={filtradas}
          origem={`Favoritas${listaAtual ? ` — ${listaAtual.nome}` : ""}${filtroStatus !== "todos" ? ` — ${filtroStatus}` : ""}`}
          onClose={() => setCompartilhar(false)}
        />
      )}

      {/* Modal: Nova/Editar Lista */}
      {modalNovaLista && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-lg max-w-sm w-full p-6 space-y-4">
            <h2 className="font-semibold text-lg">
              {editandoLista ? "Editar Lista" : "Nova Lista de Favoritos"}
            </h2>
            <input
              autoFocus
              value={nomeLista}
              onChange={(e) => setNomeLista(e.target.value)}
              placeholder="Nome da lista (ex: Tecnologia, Serviços)"
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="space-y-2">
              <label className="text-xs font-medium">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {CORES_LISTA_NOMES.map((cor) => (
                  <button
                    key={cor}
                    onClick={() => setCorLista(cor)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      corLista === cor ? "border-foreground scale-110" : "border-transparent"
                    } ${CORES_LISTA[cor]}`}
                    title={cor}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setNomeLista("");
                  setCorLista("blue");
                  setEditandoLista(null);
                  setModalNovaLista(false);
                }}
                className="px-3 py-2 border rounded-lg hover:bg-muted text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={editandoLista ? handleAtualizarLista : handleCriarLista}
                disabled={!nomeLista.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm disabled:opacity-50"
              >
                {editandoLista ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mover para Lista */}
      {modalMoverPara && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-lg max-w-sm w-full p-6 space-y-4">
            <h2 className="font-semibold text-lg">Mover para Lista</h2>
            <p className="text-xs text-muted-foreground">{modalMoverPara.titulo}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => handleMoverPara(null)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm border"
              >
                ✓ Sem Lista (Favoritado sem organização)
              </button>
              {listas.map((lista) => (
                <button
                  key={lista.id}
                  onClick={() => handleMoverPara(lista.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${CORES_LISTA[lista.cor || "blue"]}`}
                >
                  ✓ {lista.nome}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
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
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card border rounded-xl p-3.5 sm:p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}