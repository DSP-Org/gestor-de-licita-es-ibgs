import { useRef } from "react";
import { X, FileText, Download, Building2, Calendar, MapPin, DollarSign, Tag, Globe, Clock } from "lucide-react";
import { formatValor, formatDataBr } from "@/components/licitacoes/LicitacaoCard";
import { calcularUrgenciaAbertura } from "@/lib/prazosLicitacao";

export default function ResumoLicitacaoDialog({ licitacao, onClose }) {
  const reportRef = useRef(null);

  const linkEdital = licitacao.link_externo || licitacao.link;
  const urg = calcularUrgenciaAbertura(licitacao.abertura_datetime, licitacao.abertura);

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
        {/* Header da janela */}
        <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between shrink-0 z-10">
          <h2 className="font-heading font-semibold flex items-center gap-2 text-sm sm:text-base">
            <FileText className="w-4 h-4 text-slate-600" /> Relatório de Licitação
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={baixarPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700"
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
          <div ref={reportRef} className="bg-white text-slate-800 rounded-lg overflow-hidden border border-slate-200 shadow-sm font-body" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>

            {/* Cabeçalho institucional */}
            <div className="border-b-2 border-slate-800 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Logo */}
                  <div className="flex items-center justify-center w-10 h-10 bg-slate-800 rounded-lg shrink-0">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Licitalerta360</h1>
                    <p className="text-[11px] text-slate-500 mt-0.5">Sistema de Gestão de Licitações</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Relatório</p>
                  <p className="text-sm font-bold text-slate-800">Licitação Pública</p>
                </div>
              </div>
            </div>

            {/* Título da licitação */}
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Edital nº {licitacao.id_licitacao || "—"}</p>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {licitacao.orgao ? `${licitacao.orgao} — ` : ""}{licitacao.titulo}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
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
                {urg?.label && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {urg.label}
                  </span>
                )}
              </div>
            </div>

            {/* Tabela de dados */}
            <div className="px-8 py-6">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {linhasResumo.map((linha, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-4 align-top w-48">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <linha.icon className="w-3 h-3" /> {linha.label}
                        </span>
                      </td>
                      <td className="py-2.5 align-top">
                        <span className={`font-semibold ${linha.destaque ? "text-slate-900 text-base" : "text-slate-700"}`}>
                          {linha.value}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Status de gestão */}
              <div className="mt-5 pt-5 border-t border-slate-200 flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Status</p>
                  <span className="text-sm font-semibold text-slate-700">
                    {statusLabels[licitacao.status] || licitacao.status || "—"}
                  </span>
                </div>
                {licitacao.favorito && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Favorito</p>
                    <span className="text-sm font-semibold text-slate-700">⭐ Sim</span>
                  </div>
                )}
                {licitacao.busca_origem && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Busca de Origem</p>
                    <span className="text-sm font-semibold text-slate-700">{licitacao.busca_origem}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Objeto */}
            {licitacao.objeto && (
              <div className="px-8 py-5 border-t border-slate-200 bg-slate-50">
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <FileText className="w-3.5 h-3.5" /> Objeto da Contratação
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{licitacao.objeto}</p>
              </div>
            )}

            {/* Notas internas */}
            {licitacao.notas && (
              <div className="px-8 py-5 border-t border-slate-200">
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <FileText className="w-3.5 h-3.5" /> Notas Internas
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{licitacao.notas}</p>
              </div>
            )}

            {/* Links */}
            {(linkEdital || licitacao.link) && (
              <div className="px-8 py-5 border-t border-slate-200">
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Globe className="w-3.5 h-3.5" /> Links
                </h3>
                <div className="space-y-1.5">
                  {linkEdital && (
                    <a href={linkEdital} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 hover:underline">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Portal / Edital oficial</span>
                    </a>
                  )}
                  {licitacao.link && licitacao.link !== linkEdital && (
                    <a href={licitacao.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 hover:underline">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Ver no Alerta Licitação</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div className="border-t-2 border-slate-800 px-8 py-4 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 bg-slate-800 rounded shrink-0">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Licitalerta360</span>
                  <span className="text-[11px] text-slate-400">· Data5 Tecnologia</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Gerado em {dataGeracao}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}