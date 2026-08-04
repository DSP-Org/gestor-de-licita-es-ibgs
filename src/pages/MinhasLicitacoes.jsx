import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Star, FileText, Clock, CheckCircle2, LayoutGrid, Table, Share2, Trash2, Wallet } from "lucide-react";
import { STATUS_OPTIONS } from "@/shared/alertaApi";
import LicitacaoCard from "@/components/licitacoes/LicitacaoCard";
import LicitacaoTable from "@/components/licitacoes/LicitacaoTable";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import ShareDialog from "@/components/licitacoes/ShareDialog";

export default function MinhasLicitacoes() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [soFavoritos, setSoFavoritos] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [modo, setModo] = useState("cards");
  const [compartilhar, setCompartilhar] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const lista = await base44.entities.Licitacao.list("-updated_date", 500);
      setLicitacoes(lista);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = useMemo(() => {
    return licitacoes.filter((l) => {
      if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
      if (soFavoritos && !l.favorito) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const txt = `${l.titulo} ${l.objeto} ${l.orgao} ${l.municipio} ${l.uf} ${l.id_licitacao}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [licitacoes, filtroStatus, busca, soFavoritos]);

  const stats = useMemo(() => {
    const porStatus = {};
    STATUS_OPTIONS.forEach((s) => (porStatus[s.value] = 0));
    licitacoes.forEach((l) => {
      if (porStatus[l.status] !== undefined) porStatus[l.status]++;
    });
    const valorTotal = licitacoes.reduce((soma, l) => soma + (Number(l.valor) || 0), 0);
    return {
      valorTotal,
      total: licitacoes.length,
      favoritas: licitacoes.filter((l) => l.favorito).length,
      ganhas: porStatus.ganha,
      acompanhando: porStatus.acompanhando + porStatus.participando,
    };
  }, [licitacoes]);

  const handleSave = async (dados) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = dados;
    if (selecionada?.id) {
      await base44.entities.Licitacao.update(selecionada.id, rest);
    } else {
      await base44.entities.Licitacao.create(rest);
    }
    setSelecionada(null);
    carregar();
  };

  const handleDelete = async (licitacao) => {
    if (!window.confirm(`Excluir "${licitacao.titulo}" da sua lista?`)) return;
    await base44.entities.Licitacao.delete(licitacao.id);
    setLicitacoes((prev) => prev.filter((l) => l.id !== licitacao.id));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-heading text-xl sm:text-3xl font-bold tracking-tight">Minhas Licitações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as licitações que você está acompanhando.</p>
      </div>

      <div className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Valor total das licitações</p>
          <p className="text-2xl sm:text-3xl font-bold leading-tight truncate">
            {stats.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={FileText} label="Total" value={stats.total} color="text-blue-600 bg-blue-50" />
        <StatCard icon={Star} label="Favoritas" value={stats.favoritas} color="text-amber-600 bg-amber-50" />
        <StatCard icon={Clock} label="Acompanhando" value={stats.acompanhando} color="text-purple-600 bg-purple-50" />
        <StatCard icon={CheckCircle2} label="Ganhas" value={stats.ganhas} color="text-green-600 bg-green-50" />
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 bg-card border rounded-xl p-2 shadow-sm">
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
          <button
            onClick={() => setSoFavoritos(!soFavoritos)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-lg shrink-0 transition-colors ${soFavoritos ? "bg-amber-50 border-amber-300 text-amber-700" : "hover:bg-muted"}`}
          >
            <Star className={`w-4 h-4 ${soFavoritos ? "fill-amber-400 text-amber-400" : ""}`} />
            <span className="hidden sm:inline">Favoritas</span>
          </button>
          <div className="hidden sm:inline-flex items-center border rounded-lg overflow-hidden shrink-0">
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
        <div className="text-center py-16 text-muted-foreground">Carregando licitações...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-muted-foreground">Nenhuma licitação encontrada.</p>
          <a href="/explorar" className="inline-block text-sm text-primary underline">Explorar a API para salvar licitações →</a>
        </div>
      ) : (
        modo === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtradas.map((l) => (
              <LicitacaoCard
                key={l.id}
                licitacao={l}
                onClick={() => setSelecionada(l)}
                action={
                  <button
                    onClick={() => handleDelete(l)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir da lista
                  </button>
                }
              />
            ))}
          </div>
        ) : (
          <LicitacaoTable licitacoes={filtradas} onRowClick={setSelecionada} onDelete={handleDelete} />
        )
      )}

      {selecionada && (
        <LicitacaoDetailDialog licitacao={selecionada} onClose={() => setSelecionada(null)} onSave={handleSave} />
      )}

      {compartilhar && (
        <ShareDialog
          licitacoes={filtradas}
          origem={`Minhas licitações${filtroStatus !== "todos" ? ` — ${filtroStatus}` : ""}`}
          onClose={() => setCompartilhar(false)}
        />
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