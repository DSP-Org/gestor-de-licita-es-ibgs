import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { STATUS_OPTIONS } from "@/shared/alertaApi";
import { useUserFilter } from "@/lib/UserFilterContext";
import LicitacaoCard, { formatValor } from "@/components/licitacoes/LicitacaoCard";
import LicitacaoTable from "@/components/licitacoes/LicitacaoTable";
import AtualizacaoActions from "@/components/licitacoes/AtualizacaoActions";
import { toArray } from "@/lib/toArray";
import { Search, Filter, Trash2 } from "lucide-react";

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const MODALIDADES = [
  "Pregão",
  "Pregão eletrônico",
  "Pregão presencial",
  "Concorrência",
  "Convite",
  "Tomada de Preço",
  "Dispensa de Licitação",
  "Contratação Direta"
];

export default function BuscaAvancada() {
  const [filtros, setFiltros] = useState({
    titulo: "",
    uf: "",
    municipio: "",
    modalidade: "",
    dataAberturaInicio: "",
    dataAberturaFim: "",
    valorMinimo: "",
    valorMaximo: "",
    status: "",
  });

  const [licitacoes, setLicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [visualizacao, setVisualizacao] = useState("cards");
  const { filtroUsuario } = useUserFilter();
  const [municipios, setMunicipios] = useState([]);

  // Carrega municípios quando UF muda
  useEffect(() => {
    if (filtros.uf) {
      carregarMunicipios(filtros.uf);
    } else {
      setMunicipios([]);
    }
  }, [filtros.uf]);

  async function carregarMunicipios(uf) {
    try {
      const dados = await base44.entities.Licitacao.filter(
        { uf },
        "-created_date",
        500
      );
      const lista = toArray(dados);
      const municipiosUnicos = [...new Set(lista.map(l => l.municipio))].filter(Boolean).sort();
      setMunicipios(municipiosUnicos);
    } catch (err) {
      console.error("Erro ao carregar municípios:", err);
    }
  }

  async function executarBusca() {
    setCarregando(true);
    setErro("");

    try {
      const filtro = {};

      if (filtros.uf) filtro.uf = filtros.uf;
      if (filtros.municipio) filtro.municipio = filtros.municipio;
      if (filtros.modalidade) filtro.tipo = filtros.modalidade;
      if (filtros.status) filtro.status = filtros.status;

      const dados = await base44.entities.Licitacao.filter(
        filtro,
        "-created_date",
        500
      );

      // Filtros adicionais no cliente (range de datas, valores e palavra-chave)
      let resultado = toArray(dados);

      if (filtros.titulo) {
        const termo = filtros.titulo.toLowerCase();
        resultado = resultado.filter(l =>
          (l.titulo && l.titulo.toLowerCase().includes(termo)) ||
          (l.objeto && l.objeto.toLowerCase().includes(termo))
        );
      }

      if (filtros.dataAberturaInicio) {
        const dataInicio = new Date(filtros.dataAberturaInicio);
        resultado = resultado.filter(l => {
          const dataAbertura = l.abertura_datetime ? new Date(l.abertura_datetime) : null;
          return dataAbertura && dataAbertura >= dataInicio;
        });
      }

      if (filtros.dataAberturaFim) {
        const dataFim = new Date(filtros.dataAberturaFim);
        dataFim.setHours(23, 59, 59);
        resultado = resultado.filter(l => {
          const dataAbertura = l.abertura_datetime ? new Date(l.abertura_datetime) : null;
          return dataAbertura && dataAbertura <= dataFim;
        });
      }

      if (filtros.valorMinimo) {
        const min = parseFloat(filtros.valorMinimo);
        resultado = resultado.filter(l => {
          const valor = parseFloat(l.valor) || 0;
          return valor >= min;
        });
      }

      if (filtros.valorMaximo) {
        const max = parseFloat(filtros.valorMaximo);
        resultado = resultado.filter(l => {
          const valor = parseFloat(l.valor) || 0;
          return valor <= max;
        });
      }

      setLicitacoes(resultado);
    } catch (err) {
      setErro("Erro ao executar busca: " + err.message);
    } finally {
      setCarregando(false);
    }
  }

  function limparFiltros() {
    setFiltros({
      titulo: "",
      uf: "",
      municipio: "",
      modalidade: "",
      dataAberturaInicio: "",
      dataAberturaFim: "",
      valorMinimo: "",
      valorMaximo: "",
      status: "",
    });
    setLicitacoes([]);
    setErro("");
  }

  function handleMudarFiltro(campo, valor) {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor,
      ...(campo === "uf" && { municipio: "" }) // Reseta município ao mudar UF
    }));
  }

  async function handleMarcarLeitura(licId, novoStatus) {
    try {
      await base44.entities.Licitacao.update(licId, { status_leitura: novoStatus });
      setLicitacoes(prev =>
        prev.map(l => l.id_licitacao === licId ? { ...l, status_leitura: novoStatus } : l)
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  }

  async function handleDelete(licacao) {
    if (!confirm("Descartar esta licitação?")) return;
    try {
      await base44.entities.Licitacao.update(licacao.id_licitacao, { status: "descartada" });
      setLicitacoes(prev => prev.filter(l => l.id_licitacao !== licacao.id_licitacao));
    } catch (err) {
      console.error("Erro ao descartar:", err);
      alert("Erro ao descartar licitação");
    }
  }

  async function handleEnviarLicitacao(licacao) {
    const emails = prompt("Enviar para (e-mails separados por vírgula):");
    if (!emails) return;
    alert("Funcionalidade de envio em desenvolvimento");
  }

  async function handleFavoritarLicitacao(licacao) {
    try {
      const novoFav = !licacao.favorito;
      await base44.entities.Licitacao.update(licacao.id_licitacao, { favorito: novoFav });
      setLicitacoes(prev =>
        prev.map(l => l.id_licitacao === licacao.id_licitacao ? { ...l, favorito: novoFav } : l)
      );
    } catch (err) {
      console.error("Erro ao favoritar:", err);
      alert("Erro ao favoritar licitação");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Busca Avançada</h1>
          <p className="text-muted-foreground">Configure filtros avançados para encontrar licitações específicas</p>
        </div>

        {/* Painel de Filtros */}
        <div className="bg-card border rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Palavra-chave */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Palavra-chave</label>
              <input
                type="text"
                placeholder="Título ou objeto"
                value={filtros.titulo}
                onChange={(e) => handleMudarFiltro("titulo", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* UF */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Estado (UF)</label>
              <select
                value={filtros.uf}
                onChange={(e) => handleMudarFiltro("uf", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todos</option>
                {ESTADOS.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            {/* Município */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Município</label>
              <select
                value={filtros.municipio}
                onChange={(e) => handleMudarFiltro("municipio", e.target.value)}
                disabled={!filtros.uf}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">Todos</option>
                {municipios.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Modalidade */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Modalidade</label>
              <select
                value={filtros.modalidade}
                onChange={(e) => handleMudarFiltro("modalidade", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todas</option>
                {MODALIDADES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status de Gestão</label>
              <select
                value={filtros.status}
                onChange={(e) => handleMudarFiltro("status", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todos</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtros de Data e Valor */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Data de Abertura - Início */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Abertura - Início</label>
              <input
                type="date"
                value={filtros.dataAberturaInicio}
                onChange={(e) => handleMudarFiltro("dataAberturaInicio", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Data de Abertura - Fim */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Abertura - Fim</label>
              <input
                type="date"
                value={filtros.dataAberturaFim}
                onChange={(e) => handleMudarFiltro("dataAberturaFim", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Valor Mínimo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Valor Mínimo</label>
              <input
                type="number"
                placeholder="R$ 0,00"
                value={filtros.valorMinimo}
                onChange={(e) => handleMudarFiltro("valorMinimo", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Valor Máximo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Valor Máximo</label>
              <input
                type="number"
                placeholder="R$ 999.999,99"
                value={filtros.valorMaximo}
                onChange={(e) => handleMudarFiltro("valorMaximo", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={executarBusca}
              disabled={carregando}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {carregando ? "Buscando..." : "Buscar"}
            </button>
            <button
              onClick={limparFiltros}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-input text-foreground rounded-lg font-medium hover:bg-muted"
            >
              <Trash2 className="w-4 h-4" />
              Limpar
            </button>
            {licitacoes.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {licitacoes.length} resultado{licitacoes.length !== 1 ? "s" : ""} encontrado{licitacoes.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {erro && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {erro}
            </div>
          )}
        </div>

        {/* Resultados */}
        {licitacoes.length > 0 && (
          <div>
            {/* Toggle Visualização */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setVisualizacao("cards")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  visualizacao === "cards"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setVisualizacao("table")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  visualizacao === "table"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                Tabela
              </button>
            </div>

            {/* Visualização de Cards */}
            {visualizacao === "cards" && (
              <div className="grid grid-cols-1 gap-4">
                {licitacoes.map(lic => (
                  <LicitacaoCard
                    key={lic.id_licitacao}
                    licitacao={lic}
                    action={
                      <AtualizacaoActions
                        onSend={() => handleEnviarLicitacao(lic)}
                        onSave={() => handleFavoritarLicitacao(lic)}
                        onDelete={() => handleDelete(lic)}
                      />
                    }
                  />
                ))}
              </div>
            )}

            {/* Visualização de Tabela */}
            {visualizacao === "table" && (
              <LicitacaoTable
                licitacoes={licitacoes}
                onDelete={handleDelete}
                renderActions={(lic) => (
                  <AtualizacaoActions
                    onSend={() => handleEnviarLicitacao(lic)}
                    onSave={() => handleFavoritarLicitacao(lic)}
                    onDelete={() => handleDelete(lic)}
                  />
                )}
              />
            )}
          </div>
        )}

        {!carregando && licitacoes.length === 0 && !erro && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Configure os filtros e clique em "Buscar" para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}
