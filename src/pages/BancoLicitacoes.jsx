import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, Check, Loader2, Database, LayoutGrid, Table } from "lucide-react";
import LicitacaoCard from "@/components/licitacoes/LicitacaoCard";
import LicitacaoTable from "@/components/licitacoes/LicitacaoTable";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import { toArray } from "@/lib/toArray";

export default function BancoLicitacoes() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState("cards");
  const [salvasIds, setSalvasIds] = useState(new Set());
  const [salvandoId, setSalvandoId] = useState(null);
  const [selecionada, setSelecionada] = useState(null);

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
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return licitacoes;
    return licitacoes.filter((l) =>
      [l.titulo, l.objeto, l.orgao, l.uf, l.municipio, l.tipo]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo))
    );
  }, [licitacoes, busca]);

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
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Database className="w-5 h-5" /> Banco de Licitação
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Todas as licitações já consultadas por qualquer usuário, reunidas em um único lugar.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, órgão, UF, município ou modalidade..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="hidden md:inline-flex items-center border rounded-md overflow-hidden shrink-0">
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
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{filtradas.length}</span> licitação(ões) no banco.
          </p>
          {modo === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtradas.map((lic) => {
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
            <LicitacaoTable licitacoes={filtradas} onRowClick={setSelecionada} />
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