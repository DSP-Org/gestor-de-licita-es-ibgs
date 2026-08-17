import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, ExternalLink, Star, Save, FileDown, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { jsPDF } from "jspdf";
import { STATUS_OPTIONS } from "@/shared/alertaApi";
import { toArray } from "@/lib/toArray";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";
import { escopoUnidade } from "@/lib/escopoUnidade";
import { StatusBadge, formatValor, formatDataBr } from "./LicitacaoCard";
import ShareDialog from "./ShareDialog";

export default function LicitacaoDetailDialog({ licitacao, onClose, onSave, onPrev, onNext, onMarcarLeitura }) {
  const { isAdmin, filtroUnidade } = useUnidadeFilter();
  const [status, setStatus] = useState(licitacao?.status || "interessado");
  const [favorito, setFavorito] = useState(!!licitacao?.favorito);
  const [notas, setNotas] = useState(licitacao?.notas || "");
  const [valorProposta, setValorProposta] = useState(licitacao?.valor_proposta || "");
  const [listaVinculada, setListaVinculada] = useState(licitacao?.lista_favorita_id || "");
  const [listas, setListas] = useState([]);
  const [carregandoListas, setCarregandoListas] = useState(false);
  const [compartilhar, setCompartilhar] = useState(false);
  const [statusLeitura, setStatusLeitura] = useState(licitacao?.status_leitura || "nova");

  useEffect(() => {
    if (licitacao) {
      setStatus(licitacao.status || "interessado");
      setFavorito(!!licitacao.favorito);
      setNotas(licitacao.notas || "");
      setValorProposta(licitacao.valor_proposta || "");
      setListaVinculada(licitacao.lista_favorita_id || "");
      setStatusLeitura(licitacao.status_leitura || "nova");
    }
  }, [licitacao]);

  useEffect(() => {
    const carregarListas = async () => {
      setCarregandoListas(true);
      try {
        const listasData = await base44.entities.FavoritaLista.filter(
          escopoUnidade(isAdmin, filtroUnidade),
          "ordem",
          100,
        );
        setListas(toArray(listasData).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)));
      } catch (err) {
        console.error("Erro ao carregar listas:", err);
      } finally {
        setCarregandoListas(false);
      }
    };

    carregarListas();
  }, [isAdmin, filtroUnidade]);

  if (!licitacao) return null;

  const handleSave = () => {
    onSave({
      ...licitacao,
      status,
      favorito,
      notas,
      valor_proposta: valorProposta === "" ? null : Number(valorProposta),
      lista_favorita_id: listaVinculada || null,
    });
  };

  const gerarPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const maxW = pageW - margin * 2;
    let y = 20;

    // Cabeçalho com a identidade do sistema (logo + nome)
    doc.setFillColor(15, 15, 15);
    doc.roundedRect(margin, y, 12, 12, 2, 2, "F");
    // Sino simplificado em branco dentro do quadrado
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
    doc.text("Licitalerta360", margin + 16, y + 5);
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
      ["Publicação", formatDataBr(licitacao.data_publicacao)],
      ["Sincronização", formatDataBr(licitacao.data_sincronizacao || licitacao.created_date)],
      ["Abertura", licitacao.aberturaComHora || licitacao.abertura],
      ["Valor estimado", formatValor(licitacao.valor)],
      ["Valor da proposta", valorProposta ? `R$ ${Number(valorProposta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"],
      ["Link", licitacao.link || "—"],
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
    y += 5 * linhasObj.length + 6;

    if (notas) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text("Anotações:", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const linhasNotas = doc.splitTextToSize(notas, maxW);
      doc.text(linhasNotas, margin, y);
    }

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-xs font-mono text-muted-foreground">{licitacao.id_licitacao}</span>
          </div>
          <div className="flex items-center gap-1">
            {(onPrev !== undefined || onNext !== undefined) && (
              <>
                <button onClick={onPrev || undefined} disabled={!onPrev} title="Anterior" className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={onNext || undefined} disabled={!onNext} title="Próxima" className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold leading-snug">{licitacao.titulo}</h2>
            <button
              onClick={() => setFavorito(!favorito)}
              className={`p-2 rounded-md border ${favorito ? "bg-amber-50 border-amber-300" : "hover:bg-muted"}`}
            >
              <Star className={`w-4 h-4 ${favorito ? "fill-amber-400 text-amber-400" : ""}`} />
            </button>
          </div>

          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Objeto</h4>
            <p className="text-sm leading-relaxed">{licitacao.objeto || "—"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Órgão" value={licitacao.orgao} />
            <Info label="Município" value={`${licitacao.municipio || "—"} / ${licitacao.uf || "—"}`} />
            <Info label="Modalidade" value={licitacao.tipo} />
            <Info label="Valor estimado" value={formatValor(licitacao.valor)} />
            <Info label="Publicação" value={formatDataBr(licitacao.data_publicacao)} />
            <Info label="Abertura" value={licitacao.aberturaComHora || licitacao.abertura} />
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
              <label className="text-xs font-medium text-muted-foreground">Status de leitura</label>
              <div className="mt-1 flex gap-2">
                {["nova", "vista", "lida"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusLeitura(s);
                      if (onMarcarLeitura) onMarcarLeitura(licitacao.id, s);
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                      statusLeitura === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              {(licitacao.data_sincronizacao || licitacao.created_date) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Sincronizado em: {formatDataBr(licitacao.data_sincronizacao || licitacao.created_date)}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Adicionar à lista</label>
              <select
                value={listaVinculada}
                onChange={(e) => setListaVinculada(e.target.value)}
                disabled={carregandoListas}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">Sem lista (favoritado solto)</option>
                {listas.map((lista) => (
                  <option key={lista.id} value={lista.id}>
                    {lista.nome}
                  </option>
                ))}
              </select>
              {listas.length === 0 && !carregandoListas && (
                <p className="text-xs text-muted-foreground mt-1">Nenhuma lista disponível. Crie uma na seção de favoritos.</p>
              )}
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

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 border-t pt-4">
            {licitacao.link_externo && (
              <a href={licitacao.link_externo} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm border rounded-md hover:bg-muted">
                <ExternalLink className="w-4 h-4" /> Portal
              </a>
            )}
            <button
              onClick={() => setCompartilhar(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm border rounded-md hover:bg-muted"
            >
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
            <button
              onClick={gerarPDF}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm border rounded-md hover:bg-muted"
            >
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={handleSave}
              className="col-span-2 sm:col-span-1 sm:ml-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90"
            >
              <Save className="w-4 h-4" /> Salvar
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