import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { buscarLicitacoes } from "@/shared/alertaApi";
import { Plus, Check, Loader2, AlertCircle, Mail, LayoutGrid, Table, FileDown } from "lucide-react";
import LicitacaoFilters from "@/components/licitacoes/LicitacaoFilters";
import LicitacaoCard from "@/components/licitacoes/LicitacaoCard";
import LicitacaoTable from "@/components/licitacoes/LicitacaoTable";
import LicitacaoDetailDialog from "@/components/licitacoes/LicitacaoDetailDialog";
import EmailResultsDialog from "@/components/licitacoes/EmailResultsDialog";
import { toArray } from "@/lib/toArray";
import { exportarLicitacoesPDF } from "@/lib/exportarLicitacoesPDF";

const filtrosIniciais = { uf: "", palavra_chave: "", modalidade: "", municipio_ibge: "", municipio_nome: "", data_insercao: "", data_inicio: "", data_fim: "" };

export default function Explorar() {
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [resultados, setResultados] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [salvasIds, setSalvasIds] = useState(new Set());
  const [salvandoId, setSalvandoId] = useState(null);
  const [selecionada, setSelecionada] = useState(null);
  const [enviarEmail, setEnviarEmail] = useState(false);
  const [modo, setModo] = useState("cards");
  const [selecionados, setSelecionados] = useState(new Set());

  const toggleSelecao = (id, checked) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const carregarSalvas = async () => {
    try {
      const lista = await base44.entities.Licitacao.list("-updated_date", 500);
      setSalvasIds(new Set(toArray(lista).map((l) => l.id_licitacao)));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    carregarSalvas();
  }, []);

  const buscar = async () => {
    const temFiltro = !!(filtros.uf || filtros.palavra_chave || filtros.modalidade || filtros.municipio_ibge);
    if (!temFiltro) {
      setErro("Informe ao menos um filtro (UF, município, palavra-chave ou modalidade) para buscar.");
      return;
    }
    setLoading(true);
    setErro("");
    setResultados([]);
    setMeta(null);
    setSelecionados(new Set());
    try {
      const data = await buscarLicitacoes({ ...filtros, pagina: 1, licitacoesPorPagina: 50 });
      if (data.totalErros > 0) {
        setErro(data.erros.map((e) => e.descricao).join("; "));
      } else {
        setResultados(toArray(data.licitacoes));
        setMeta({
          total: data.totalLicitacoes,
          paginas: data.paginas,
          nestaPagina: data.licitacoesNestaPagina,
        });
      }
    } catch (e) {
      setErro(e.message || "Erro ao consultar a API.");
    } finally {
      setLoading(false);
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
        favorito: false,
        salva_manualmente: true,
      });
      setSalvasIds((prev) => new Set(prev).add(lic.id_licitacao));
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold">Explorar API</h1>
        <p className="text-sm text-muted-foreground mt-1">Consulte licitações abertas em tempo real e salve as de interesse.</p>
      </div>

      <LicitacaoFilters
        filtros={filtros}
        onChange={setFiltros}
        onBuscar={buscar}
        onLimpar={() => setFiltros(filtrosIniciais)}
        loading={loading}
      />

      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          <AlertCircle className="w-4 h-4" /> {erro}
        </div>
      )}

      {meta && (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{meta.total}</span> licitações · {meta.nestaPagina} na pág. 1 de {meta.paginas}
          </div>
          {resultados.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {selecionados.size} selecionada{selecionados.size === 1 ? "" : "s"}
              </span>
              <div className="hidden md:inline-flex items-center border rounded-md overflow-hidden shrink-0">
                <button
                  onClick={() => setModo("cards")}
                  title="Visualização em cards"
                  className={`p-1.5 ${modo === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setModo("tabela")}
                  title="Visualização em tabela"
                  className={`p-1.5 border-l ${modo === "tabela" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  <Table className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => exportarLicitacoesPDF(resultados, "Explorar — Licitações")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-muted"
              >
                <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Exportar PDF</span><span className="sm:hidden">PDF</span>
              </button>
              <button
                onClick={() => setEnviarEmail(true)}
                disabled={selecionados.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-muted disabled:opacity-50"
              >
                <Mail className="w-4 h-4" /> <span className="hidden sm:inline">Enviar por e-mail</span><span className="sm:hidden">E-mail</span>
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Consultando a API...
        </div>
      ) : modo === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resultados.map((lic) => {
            const jaSalva = salvasIds.has(lic.id_licitacao);
            const sel = selecionados.has(lic.id_licitacao);
            return (
              <div key={lic.id_licitacao} className="relative">
                <label className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-card/90 backdrop-blur px-2 py-1 rounded-md border text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={(e) => toggleSelecao(lic.id_licitacao, e.target.checked)}
                    className="w-3.5 h-3.5 rounded cursor-pointer"
                  />
                  <span className="text-muted-foreground">Enviar</span>
                </label>
                <LicitacaoCard
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
              </div>
            );
          })}
        </div>
      ) : (
        <LicitacaoTable
          licitacoes={resultados}
          onRowClick={setSelecionada}
          selecionados={selecionados}
          onToggleSelecao={toggleSelecao}
        />
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

      {enviarEmail && (
        <EmailResultsDialog
          licitacoes={resultados.filter((l) => selecionados.has(l.id_licitacao))}
          origem="Explorar API"
          onClose={() => setEnviarEmail(false)}
        />
      )}
    </div>
  );
}