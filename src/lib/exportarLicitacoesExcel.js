import { formatValor } from "@/components/licitacoes/LicitacaoCard";
import { calcularUrgenciaAbertura } from "@/lib/prazosLicitacao";
import { STATUS_OPTIONS } from "@/shared/alertaApi";

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]));

/**
 * Gera um arquivo .csv (compatível com Excel) a partir de uma lista de licitações.
 * Inclui Resumo Executivo no cabeçalho, coluna de Status e Urgência de abertura.
 */
export function exportarLicitacoesExcel(licitacoes, nomeArquivo = "licitacoes") {
  // ── Resumo Executivo ────────────────────────────────────────────────
  const totalLics = licitacoes.length;
  const valorTotal = licitacoes.reduce((soma, l) => soma + (Number(l.valor) || 0), 0);
  const valorEmDisputa = licitacoes
    .filter((l) => l.status === "participando" || l.status === "acompanhando")
    .reduce((soma, l) => soma + (Number(l.valor) || 0), 0);

  const colunas = [
    "ID",
    "Título",
    "Objeto",
    "Órgão",
    "UF",
    "Município",
    "Modalidade",
    "Abertura",
    "Status",
    "Urgência",
    "Valor",
    "Link",
  ];

  const escapar = (valor) => {
    const texto = String(valor ?? "").replace(/"/g, '""');
    return `"${texto}"`;
  };

  const linhas = licitacoes.map((l) => {
    // Urgência de abertura
    const urg = calcularUrgenciaAbertura(l.abertura_datetime, l.abertura);
    const urgenciaLabel =
      urg.tipo !== "sem_data"
        ? `${l.aberturaComHora || l.abertura || "—"} (${urg.label})`
        : l.aberturaComHora || l.abertura || "—";

    return [
      escapar(l.id_licitacao),
      escapar(l.titulo),
      escapar(l.objeto),
      escapar(l.orgao),
      escapar(l.uf),
      escapar(l.municipio),
      escapar(l.tipo),
      escapar(l.aberturaComHora || l.abertura),
      escapar(STATUS_LABELS[l.status] || l.status || "—"),
      escapar(urgenciaLabel),
      escapar(formatValor(l.valor)),
      escapar(l.link_externo || l.link),
    ];
  });

  // ── Cabeçalho Executivo (3 primeiras linhas) ─────────────────────────
  const resumoLinhas = [
    `Resumo Executivo;Total de Licitações: ${totalLics};Valor Total: ${formatValor(valorTotal)};Valor em Disputa: ${formatValor(valorEmDisputa)}`,
    `Exportado em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    "", // linha em branco separadora
  ];

  const csv = [
    ...resumoLinhas,
    colunas.map(escapar).join(";"),
    ...linhas.map((linha) => linha.join(";")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nomeArquivo}-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}