import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ExternalLink, Star, Save, FileDown, Loader2, Search, Share2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { STATUS_OPTIONS } from "@/shared/alertaApi";
import { StatusBadge, formatValor } from "@/components/licitacoes/LicitacaoCard";
import ShareDialog from "@/components/licitacoes/ShareDialog";

export default function LicitacaoDetalhe() {
  const { idLicitacao } = useParams();
  const navigate = useNavigate();
  const [licitacao, setLicitacao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [status, setStatus] = useState("interessado");
  const [favorito, setFavorito] = useState(false);
  const [notas, setNotas] = useState("");
  const [valorProposta, setValorProposta] = useState("");
  const [compartilhar, setCompartilhar] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    base44.entities.Licitacao.filter({ id_licitacao: idLicitacao }, "-created_date", 1)
      .then((lista) => {
        if (cancelado) return;
        const l = Array.isArray(lista) && lista.length > 0 ? lista[0] : null;
        setLicitacao(l);
        if (l) {
          setStatus(l.status || "interessado");
          setFavorito(!!l.favorito);
          setNotas(l.notas || "");
          setValorProposta(l.valor_proposta || "");
        }
      })
      .catch(() => !cancelado && setLicitacao(null))
      .finally(() => !cancelado && setLoading(false));
    return () => { cancelado = true; };
  }, [idLicitacao]);

  const salvar = async () => {
    if (!licitacao) return;
    setSalvando(true);
    try {
      const atualizada = await base44.entities.Licitacao.update(licitacao.id, {
        status,
        favorito,
        notas,
        valor_proposta: valorProposta === "" ? null : Number(valorProposta),
      });
      setLicitacao(atualizada);
    } catch (e) {
      // erro silencioso — o erro sobe para o painel de erros
    } finally {
      setSalvando(false);
    }
  };

  const gerarPDF = () => {
    if (!licitacao) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const maxW = pageW - margin * 2;
    let y = 20;

    doc.setFillColor(15, 15, 15);
    doc.roundedRect(margin, y, 12, 12, 2, 2, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setFillColor(255, 255, 255);
    doc.circle(margin + 6, y + 5.5, 2.2, "S");
    doc.setLineWidth(0.6);
    doc.line(margin + 6, y + 3.3, margin + 6, y + 2.5);
    doc.setFillColor(255, 255, 255);
    doc.circle(margin + 6, y + 8.2, 0.5, "F");

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Gestor de Licitações IBGS", margin + 16, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Gestão de licitações", margin + 16, y + 9.5);

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 15, pageW - margin, y + 15);
    y += 22;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Detalhes da Licitação", margin, y);
    y += 7;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, y);
    y += 8;

    const statusLabel = STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
    const linhas = [
      ["ID", licitacao.id_licitacao],
      ["Título", licitacao.titulo],
      ["Status", statusLabel],
      ["Órgão", licitacao.orgao],
      ["Modalidade", licitacao.tipo],
      ["Município", `${licitacao.municipio || "—"} / ${licitacao.uf || "—"}`],
      ["Código IBGE", licitacao.municipio_ibge],
      ["Abertura", licitacao.abertura],
      ["Valor estimado", formatValor(licitacao.valor)],
      ["Valor da proposta", valorProposta ? `R$ ${Number(valorProposta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"],
      ["Portal oficial", licitacao.link_externo || "—"],
    ];

    doc.setTextColor(30);
    for (const [label, value] of linhas) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(label + ":", margin, y);
      doc.setFont("helvetica", "normal");
      const linhasValor = doc.splitTextToSize(String(value || "—"), maxW - 30);
      doc.text(linhasValor, margin + 30, y);
      y += 5 * linhasValor.length + 3;
    }

    if (y > 250) { doc.addPage(); y = 20; }
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Objeto:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const linhasObj = doc.splitTextToSize(licitacao.objeto || "—", maxW);
    doc.text(linhasObj, margin, y);

    // Rodapé com crédito
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Desenvolvido por Data5 Tecnologia — Todos os direitos reservados", margin, pageH - 9);

    doc.save(`licitacao-${licitacao.id_licitacao || "detalhes"}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!licitacao) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <Search className="w-10 h-10 mx-auto text-muted-foreground" />
        <h2 className="font-heading text-lg font-semibold">Licitação não encontrada</h2>
        <p className="text-sm text-muted-foreground">
          Esta licitação ainda não foi salva no seu painel. Acesse a busca para encontrá-la.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Link to="/" className="px-4 py-2 text-sm border rounded-md hover:bg-muted">Minhas licitações</Link>
          <Link to="/explorar" className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90">Explorar buscas</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-0 space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="border-b px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-xs font-mono text-muted-foreground">{licitacao.id_licitacao}</span>
          </div>
          <button
            onClick={() => setFavorito(!favorito)}
            className={`p-2 rounded-md border ${favorito ? "bg-amber-50 border-amber-300" : "hover:bg-muted"}`}
          >
            <Star className={`w-4 h-4 ${favorito ? "fill-amber-400 text-amber-400" : ""}`} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <h1 className="font-heading text-lg font-semibold leading-snug">{licitacao.titulo}</h1>

          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Objeto</h4>
            <p className="text-sm leading-relaxed">{licitacao.objeto || "—"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Órgão" value={licitacao.orgao} />
            <Info label="Município" value={`${licitacao.municipio || "—"} / ${licitacao.uf || "—"}`} />
            <Info label="Modalidade" value={licitacao.tipo} />
            <Info label="Valor estimado" value={formatValor(licitacao.valor)} />
            <Info label="Abertura" value={licitacao.abertura} />
            <Info label="Código IBGE" value={licitacao.municipio_ibge} />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor da proposta (R$)</label>
              <input
                type="number"
                value={valorProposta}
                onChange={(e) => setValorProposta(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Anotações</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
                placeholder="Adicione observações sobre esta licitação..."
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {licitacao.link_externo && (
              <a href={licitacao.link_externo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-muted">
                <ExternalLink className="w-4 h-4" /> Portal oficial
              </a>
            )}
            <button
              onClick={() => setCompartilhar(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-muted"
            >
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
            <button
              onClick={gerarPDF}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-muted"
            >
              <FileDown className="w-4 h-4" /> Gerar PDF
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
          </div>
        </div>
      </div>

      {compartilhar && (
        <ShareDialog
          licitacoes={[licitacao]}
          origem={licitacao.titulo}
          onClose={() => setCompartilhar(false)}
        />
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}