import { useRef } from "react";
import { X, FileText, Download, Building2, Calendar, MapPin, DollarSign, Tag, Globe, Clock } from "lucide-react";
import { formatValor, formatDataBr } from "@/components/licitacoes/LicitacaoCard";
import { calcularUrgenciaAbertura } from "@/lib/prazosLicitacao";

export default function ResumoLicitacaoDialog({ licitacao, onClose }) {
  const reportRef = useRef(null);

  const linkEdital = licitacao.link_externo || licitacao.link;
  const urg = calcularUrgenciaAbertura(licitacao.abertura_datetime, licitacao.abertura);

  const urgenciaConfig = {
    hoje: { label: "Abertura Hoje", cor: "bg-destructive text-white" },
    urgente: { label: "Urgente", cor: "bg-status-amber text-status-amber-foreground" },
    em_breve: { label: "Em Breve", cor: "bg-status-blue text-status-blue-foreground" },
    encerrada: { label: "Encerrada", cor: "bg-slate-400 text-white" },
    sem_data: { label: "Sem Data", cor: "bg-slate-300 text-slate-700" },
  };
  const urgInfo = urgenciaConfig[urg.tipo] || urgenciaConfig.sem_data;

  const baixarPDF = async () => {
    if (!reportRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF } = await import("jspdf");

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`relatorio-licitacao-${licitacao.id_licitacao || "sem-id"}.pdf`);
  };

  const dataGeracao = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  const statusLabels = {
    interessado: "Interessado",
    acompanhando: "Acompanhando",
    participando: "Participando",
    vencida: "Vencida",
    ganha: "Ganha",
    perdida: "Perdida",
    descartada: "Descartada",
    em_analise: "Em Análise",
  };

  const linhasResumo = [
    { icon: Building2, label: "Órgão Responsável", value: licitacao.orgao || "—" },
    { icon: Tag, label: "Modalidade", value: licitacao.tipo || "—" },
    { icon: MapPin, label: "Localização", value: [licitacao.municipio, licitacao.uf].filter(Boolean).join(" - ") || "—" },
    { icon: Calendar, label: "Publicação", value: formatDataBr(licitacao.data_publicacao) },
    { icon: Clock, label: "Abertura / Disputa", value: licitacao.abertura || formatDataBr(licitacao.abertura_datetime) },
    { icon: DollarSign, label: "Valor Estimado", value: formatValor(licitacao.valor), destaque: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between shrink-0 z-10">
          <h2 className="font-heading font-semibold flex items-center gap-2 text-sm sm:text-base">
            <FileText className="w-4 h-4 text-primary" /> Relatório de Licitação
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={baixarPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="overflow-auto p-4 sm:p-6 flex-1">
          <div ref={reportRef} className="bg-white text-slate-800 rounded-xl overflow-hidden border border-border/40">

            {/* Banner topo */}
            <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-5 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/80">
                  Licitalerta360 · Relatório de Licitação
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${urgInfo.cor}`}>
                  {urgInfo.label}
                </span>
              </div>
              <h1 className="font-bold text-lg leading-tight mb-1">
                {licitacao.orgao ? `${licitacao.orgao} — ` : ""}{licitacao.titulo}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                {licitacao.tipo && (
                  <span className="inline-flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {licitacao.tipo}
                  </span>
                )}
                {licitacao.uf && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {licitacao.municipio ? `${licitacao.municipio} - ` : ""}{licitacao.uf}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Edital nº {licitacao.id_licitacao || "—"}
                </span>
              </div>
            </div>

            {/* Grid de metadados */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-100 border-b border-slate-100">
              {linhasResumo.map((linha, i) => (
                <div key={i} className="bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1">
                    <linha.icon className="w-3 h-3" /> {linha.label}
                  </p>
                  <p className={`text-sm font-bold ${linha.destaque ? "text-primary text-base" : "text-slate-800"}`}>
                    {linha.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Corpo do relatório */}
            <div className="px-6 py-5 space-y-4">

              {/* Status de gestão */}
              <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Status</p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {statusLabels[licitacao.status] || licitacao.status || "—"}
                  </span>
                </div>
                {licitacao.favorito && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Favorito</p>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-status-amber/10 text-status-amber">
                      ⭐ Favoritada
                    </span>
                  </div>
                )}
                {licitacao.busca_origem && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Origem</p>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-status-blue/10 text-status-blue">
                      {licitacao.busca_origem}
                    </span>
                  </div>
                )}
              </div>

              {/* Objeto */}
              {licitacao.objeto && (
                <section>
                  <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                    <FileText className="w-3.5 h-3.5" /> Objeto da Contratação
                  </h2>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                    <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{licitacao.objeto}</p>
                  </div>
                </section>
              )}

              {/* Notas internas */}
              {licitacao.notas && (
                <section>
                  <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                    <FileText className="w-3.5 h-3.5" /> Notas Internas
                  </h2>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                    <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{licitacao.notas}</p>
                  </div>
                </section>
              )}

              {/* Links */}
              {(linkEdital || licitacao.link) && (
                <section>
                  <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                    <Globe className="w-3.5 h-3.5" /> Links
                  </h2>
                  <div className="space-y-2">
                    {linkEdital && (
                      <a href={linkEdital} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Portal / Edital oficial</span>
                      </a>
                    )}
                    {licitacao.link && licitacao.link !== linkEdital && (
                      <a href={licitacao.link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Ver no Alerta Licitação</span>
                      </a>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Rodapé */}
            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50">
              <p className="text-[10px] text-slate-400 text-center">
                Relatório gerado em {dataGeracao} · Licitalerta360 · Data5 Tecnologia
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}