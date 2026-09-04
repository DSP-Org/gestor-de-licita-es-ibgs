import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, FileText, Copy, Check, Download } from "lucide-react";
import { formatValor, formatDataBr } from "@/components/licitacoes/LicitacaoCard";

function formatarCampo(valor, fallback = "—") {
  if (valor === null || valor === undefined || valor === "") return fallback;
  return String(valor);
}

export default function ResumoLicitacaoDialog({ licitacao, onClose }) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [resumo, setResumo] = useState("");
  const [copiado, setCopiado] = useState(false);

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
          modalidade: licitacao.tipo,
          valor_estimado: formatValor(licitacao.valor),
          data_publicacao: formatDataBr(licitacao.data_publicacao),
          data_abertura: licitacao.abertura || formatDataBr(licitacao.abertura_datetime),
          status: licitacao.status,
          favorito: licitacao.favorito,
          notas: licitacao.notas,
          busca_origem: licitacao.busca_origem,
          id_licitacao: licitacao.id_licitacao,
          link: licitacao.link,
          link_externo: licitacao.link_externo,
        };

        const prompt = `Você é um analista especialista em licitações públicas brasileiras. Gere um relatório executivo completo e estruturado em português para a seguinte licitação. O relatório deve ser profissional, objetivo e pronto para apresentação à diretoria.

DADOS DA LICITAÇÃO:
${JSON.stringify(dadosLicitacao, null, 2)}

CONTEXTO DA PLATAFORMA:
- Sistema: Licitalerta360 — plataforma de monitoramento e gestão inteligente de licitações públicas
- Origem dos dados: APIs de portais públicos (Alerta Licitação, PNCP - Portal Nacional de Contratações Públicas)
- Funil de gestão: Novas → Em Triagem → Favoritas / Descartadas

Gere o relatório no seguinte formato (use markdown):

## 📋 Relatório Executivo de Licitação

### 1. Visão Geral
[Resumo conciso da oportunidade: o que é, quem é o órgão, qual o objeto principal]

### 2. Identificação
- **Órgão Responsável:**
- **Modalidade:**
- **Nº do Edital/Processo:**

### 3. Cronograma
- **Data de Publicação:**
- **Data de Abertura/Disputa:**
- **Urgência:** [Avalie se é urgente com base na data de abertura]

### 4. Valor Estimado
[Análise do valor e contexto]

### 5. Objeto da Contratação
[Descrição detalhada e análise do que está sendo licitado]

### 6. Localização
- **Município/UF:**

### 7. Status na Plataforma
[Status atual no funil de gestão: ${licitacao.status}, favorito: ${licitacao.favorito ? "Sim" : "Não"}]

### 8. Recomendações
[3 a 5 recomendações práticas sobre próximos passos, pontos de atenção e estratégias]

### 9. Pontos de Atenção
[Riscos, prazos críticos e informações importantes para tomada de decisão]

---
*Relatório gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} via Licitalerta360*`;

        const resposta = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: null,
        });

        if (!cancelado) setResumo(typeof resposta === "string" ? resposta : JSON.stringify(resposta));
      } catch (e) {
        if (!cancelado) setErro(e?.message || "Não foi possível gerar o relatório.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [licitacao]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resumo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  const baixar = () => {
    const blob = new Blob([resumo], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-licitacao-${licitacao.id_licitacao || "sem-id"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between shrink-0">
          <h2 className="font-heading font-semibold flex items-center gap-2 text-sm sm:text-base">
            <FileText className="w-4 h-4 text-primary" /> Relatório de Licitação
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-auto p-5 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Gerando relatório executivo...</p>
            </div>
          ) : erro ? (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{erro}</div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed text-foreground bg-background/60 rounded-xl p-4 border border-border/40">
                {resumo}
              </pre>
            </div>
          )}
        </div>

        {!loading && !erro && (
          <div className="sticky bottom-0 bg-card border-t px-5 py-3 flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={copiar}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg hover:bg-muted"
            >
              {copiado ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              {copiado ? "Copiado!" : "Copiar"}
            </button>
            <button
              onClick={baixar}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
            >
              <Download className="w-4 h-4" /> Baixar .md
            </button>
          </div>
        )}
      </div>
    </div>
  );
}