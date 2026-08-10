import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Star, FileText, Clock, CheckCircle2, LayoutGrid, Table, Share2, Wallet } from "lucide-react";
import { STATUS_OPTIONS } from "@/shared/alertaApi";
import { toArray } from "@/lib/toArray";
import LicitacaoCard from "@/components/licitacoes/LicitacaoCard";
import LicitacaoTable from "@/components/licitacoes/LicitacaoTable";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import ShareDialog from "@/components/licitacoes/ShareDialog";

export default function FavoritasTab() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [dataAberturaIni, setDataAberturaIni] = useState("");
  const [dataAberturaFim, setDataAberturaFim] = useState("");
  const [selecionada, setSelecionada] = useState(null);
  const [modo, setModo] = useState("cards");
  const [compartilhar, setCompartilhar] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const lista = await base44.entities.Licitacao.filter({ favorito: true }, "-updated_date", 500);
      setLicitacoes(toArray(lista));
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
  }, [licitacoes, filtroStatus, busca, dataAberturaIni, dataAberturaFim]);

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
      ganhas: porStatus.ganha,
      acompanhando: porStatus.acompanhando + porStatus.participando,
    };
  }, [licitacoes]);

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

  return (
    <div className="space-y-5">
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
                <button
                  onClick={() => handleRemoverFavorito(l)}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-muted-foreground"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Remover dos favoritos
                </button>
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
          origem={`Favoritas${filtroStatus !== "todos" ? ` — ${filtroStatus}` : ""}`}
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