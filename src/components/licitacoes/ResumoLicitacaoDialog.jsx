import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, FileText, Download, Building2, Calendar, MapPin, DollarSign, ClipboardList, AlertTriangle, Lightbulb, Tag } from "lucide-react";
import { formatValor, formatDataBr } from "@/components/licitacoes/LicitacaoCard";

export default function ResumoLicitacaoDialog({ licitacao, onClose }) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      setErro("");
      try {
        const dadosLicitacao = {
          titulo: licitacao.titulo,
          orgao: licitacao.orgao,
          objeto: licitacao.objeto,
          uf: licitacao.uf,
          municipio: licitacao.municipio,
          tipo: licitacao.tipo,
          valor_estimado: licitacao.valor,
          data_publicacao: licitacao.data_publicacao,
          data_abertura: licitacao.abertura || licitacao.abertura_datetime,
          status: licitacao.status,
          favorito: licitacao.favorito,
          notas: licitacao.notas,
          busca_origem: licitacao.busca_origem,
          id_licitacao: licitacao.id_licitacao,
        };

        const prompt = `Você é um analista especialista em licitações públicas brasileiras. Analise a seguinte licitação e retorne um JSON estruturado com um relatório executivo.

DADOS DA LICITAÇÃO:
${JSON.stringify(dadosLicitacao, null, 2)}

Retorne EXATAMENTE este formato JSON:
{
  "visao_geral": "Resumo conciso da oportunidade em 2-3 frases",
  "recomendacoes": ["3 a 5 recomendações práticas sobre próximos passos"],
  "pontos_atencao": ["3 a 5 riscos, prazos críticos e informações importantes"],
  "analise_valor": "Análise do valor estimado e contexto financeiro",
  "analise_objeto": "Descrição detalhada e análise do que está sendo licitado",
  "urgencia": "Avalie: urgente, moderado ou baixo — com justificativa",
  "estrategia": "Sugestão estratégica de participação em 1-2 frases"
}`;

        const resposta = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              visao_geral: { type: "string" },
              recomendacoes: { type: "array", items: { type: "string" } },
              pontos_atencao: { type: "array", items: { type: "string" } },
              analise_valor: { type: "string" },
              analise_objeto: { type: "string" },
              urgencia: { type: "string" },
              estrategia: { type: "string" },
            },
            required: ["visao_geral", "recomendacoes", "pontos_atencao", "analise_valor", "analise_objeto", "urgencia", "estrategia"],
          },
        });

        if (!cancelado) setDados(resposta);
      } catch (e) {
        if (!cancelado) setErro(e?.message || "Não foi possível gerar o relatório.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [licitacao]);

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

  const urgenciaColor = dados?.urgencia?.toLowerCase().includes("urgente")
    ? { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" }
    : dados?.urgencia?.toLowerCase().includes("moderado")
    ? { bg: "bg-status-amber/10", text: "text-status-amber", border: "border-status-amber/30" }
    : { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between shrink-0 z-10">
          <h2 className="font-heading font-semibold flex items-center gap-2 text-sm sm:text-base">
            <FileText className="w-4 h-4 text-primary" /> Relatório Executivo
          </h2>
          <div className="flex items-center gap-2">
            {!loading && !erro && dados && (
              <button
                onClick={baixarPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="overflow-auto p-4 sm:p-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Gerando relatório executivo com IA...</p>
            </div>
          ) : erro ? (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{erro}</div>
          ) : dados ? (
            <div ref={reportRef} className="bg-white text-slate-800 rounded-xl overflow-hidden border border-border/40">

              {/* Banner topo */}
              <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-5 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/80">Licitalerta360 · Relatório de Licitação</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${urgenciaColor.bg} ${urgenciaColor.text} ${urgenciaColor.border} bg-white`}>
                    {dados.urgencia?.split("—")[0]?.trim() || "Análise"}
                  </span>
                </div>
                <h1 className="font-bold text-lg leading-tight mb-1">
                  {licitacao.orgao ? `${licitacao.orgao} — ` : ""}{licitacao.titulo}
                </h1>
                <p className="text-xs text-white/80">
                  {licitacao.municipio ? `${licitacao.municipio} - ` : ""}{licitacao.uf || ""}
                  {licitacao.tipo && ` · ${licitacao.tipo}`}
                </p>
              </div>

              {/* Grid de metadados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100 border-b border-slate-100">
                <div className="bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Edital</p>
                  <p className="text-sm font-bold text-slate-800">{licitacao.id_licitacao || "—"}</p>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Publicação</p>
                  <p className="text-sm font-bold text-slate-800">{formatDataBr(licitacao.data_publicacao)}</p>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Abertura</p>
                  <p className="text-sm font-bold text-slate-800">{licitacao.abertura || formatDataBr(licitacao.abertura_datetime)}</p>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Valor</p>
                  <p className="text-sm font-extrabold text-primary">{formatValor(licitacao.valor)}</p>
                </div>
              </div>

              {/* Corpo do relatório */}
              <div className="px-6 py-5 space-y-5">

                {/* Visão Geral */}
                <section>
                  <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                    <ClipboardList className="w-3.5 h-3.5" /> Visão Geral
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-600">{dados.visao_geral}</p>
                </section>

                {/* Análise do Objeto */}
                <section>
                  <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                    <FileText className="w-3.5 h-3.5" /> Análise do Objeto
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-600">{dados.analise_objeto}</p>
                </section>

                {/* Análise de Valor */}
                <section>
                  <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                    <DollarSign className="w-3.5 h-3.5" /> Análise de Valor
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-600">{dados.analise_valor}</p>
                </section>

                {/* Estratégia */}
                {dados.estrategia && (
                  <section className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                    <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-1">
                      <Lightbulb className="w-3.5 h-3.5" /> Estratégia Sugerida
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-700">{dados.estrategia}</p>
                  </section>
                )}

                {/* Pontos de Atenção */}
                {dados.pontos_atencao?.length > 0 && (
                  <section>
                    <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-destructive mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> Pontos de Atenção
                    </h2>
                    <ul className="space-y-1.5">
                      {dados.pontos_atencao.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-destructive font-bold mt-0.5">•</span>
                          <span className="leading-relaxed">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Recomendações */}
                {dados.recomendacoes?.length > 0 && (
                  <section>
                    <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                      <Lightbulb className="w-3.5 h-3.5" /> Recomendações
                    </h2>
                    <ol className="space-y-2">
                      {dados.recomendacoes.map((r, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{r}</span>
                        </li>
                      ))}
                    </ol>
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
          ) : null}
        </div>
      </div>
    </div>
  );
}