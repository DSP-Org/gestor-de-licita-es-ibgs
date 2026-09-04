import { jsPDF } from "jspdf";
import { formatValor } from "@/components/licitacoes/LicitacaoCard";
import { calcularUrgenciaAbertura } from "@/lib/prazosLicitacao";
import { STATUS_OPTIONS } from "@/shared/alertaApi";

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]));

export function gerarDocLicitacoesPDF(licitacoes, titulo = "Licitações") {
  if (!licitacoes || licitacoes.length === 0) {
    return null;
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;
  let pageNum = 1;

  // ── Resumo Executivo (topo do documento) ──────────────────────────
  const totalLics = licitacoes.length;
  const valorTotal = licitacoes.reduce((soma, l) => soma + (Number(l.valor) || 0), 0);
  const valorEmDisputa = licitacoes
    .filter((l) => l.status === "participando" || l.status === "acompanhando")
    .reduce((soma, l) => soma + (Number(l.valor) || 0), 0);

  const drawResumoExecutivo = () => {
    const blocoH = 18;
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(margin, y, pageW - margin * 2, blocoH, 2, 2, "F");
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageW - margin * 2, blocoH, 2, 2, "S");

    const colW = (pageW - margin * 2) / 3;
    const cellY = y + 4;

    // Coluna 1: Total de Licitações
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("TOTAL DE LICITAÇÕES", margin + 6, cellY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(String(totalLics), margin + 6, cellY + 7);

    // Coluna 2: Valor Total Estimado
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("VALOR TOTAL ESTIMADO", margin + colW + 6, cellY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(formatValor(valorTotal), margin + colW + 6, cellY + 7);

    // Coluna 3: Valor em Disputa Ativa
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("EM DISPUTA ATIVA", margin + colW * 2 + 6, cellY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(60, 120, 60);
    doc.text(formatValor(valorEmDisputa), margin + colW * 2 + 6, cellY + 7);

    y += blocoH + 4;
  };

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(titulo, margin, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Total: ${totalLics} licitações · Valor: ${formatValor(valorTotal)} · ${new Date().toLocaleString("pt-BR")}`,
      margin, y,
    );
    y += 5;
  };

  // Primeira página: resumo executivo + cabeçalho
  drawResumoExecutivo();
  drawHeader();

  // Colunas da tabela — Status + Objeto + Local + Urgência/Abertura + Valor
  const colunas = [
    { key: "status", label: "Status", width: 22, align: "left" },
    { key: "objeto", label: "Objeto", width: 80, align: "left" },
    { key: "local", label: "Local", width: 28, align: "left" },
    { key: "abertura", label: "Abertura / Urgência", width: 32, align: "center" },
    { key: "valor", label: "Valor", width: 22, align: "right" },
  ];

  const tableWidth = colunas.reduce((sum, col) => sum + col.width, 0);
  const tableX = margin;

  const drawTableHeader = () => {
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, y - 3, tableWidth, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);

    let x = tableX;
    colunas.forEach((col) => {
      doc.text(col.label, x + 1, y, { maxWidth: col.width - 2 });
      x += col.width;
    });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(tableX, y - 3, tableX + tableWidth, y - 3);
    doc.line(tableX, y + 1.5, tableX + tableWidth, y + 1.5);

    x = tableX;
    colunas.forEach((col) => {
      doc.line(x, y - 3, x, y + 1.5);
      x += col.width;
    });
    doc.line(tableX + tableWidth, y - 3, tableX + tableWidth, y + 1.5);

    y += 6;
  };

  drawTableHeader();

  const esc = (s) => String(s ?? "").replace(/[^\x20-\x7EÀ-ÿ]/g, " ").trim();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  // Processar dados
  for (const l of licitacoes) {
    const statusLabel = esc(STATUS_LABELS[l.status] || l.status || "—");
    const local = [l.uf, l.municipio].filter(Boolean).join(" · ") || "—";
    const objeto = esc(l.objeto);

    // Urgência de abertura
    const urg = calcularUrgenciaAbertura(l.abertura_datetime, l.abertura);
    const aberturaRaw = esc(l.aberturaComHora || l.abertura || "—");
    const aberturaTexto = urg.tipo !== "sem_data"
      ? `${aberturaRaw} (${urg.label})`
      : aberturaRaw;

    const valor = formatValor(l.valor);

    const splitObjetoLines = doc.splitTextToSize(objeto, colunas[1].width - 2);
    const splitAberturaLines = doc.splitTextToSize(aberturaTexto, colunas[3].width - 2);
    const linhasNecessarias = Math.max(splitObjetoLines.length, splitAberturaLines.length, 1);
    const lineHeight = 3.5 * linhasNecessarias + 1;

    if (y + lineHeight > pageH - 12) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text("Licitalerta360", margin, pageH - 6);

      doc.addPage();
      pageNum++;
      y = margin;
      drawHeader();
      drawTableHeader();
    }

    doc.setTextColor(40, 40, 40);
    let x = tableX;
    const rowStartY = y;
    const rowEndY = y + lineHeight - 1;

    // Coluna Status
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text(statusLabel, x + 1, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    x += colunas[0].width;

    // Coluna Objeto (com quebra de texto)
    doc.text(splitObjetoLines, x + 1, y);
    x += colunas[1].width;

    // Coluna Local
    doc.text(local, x + 1, y, { maxWidth: colunas[2].width - 2 });
    x += colunas[2].width;

    // Coluna Abertura / Urgência (com quebra)
    doc.text(splitAberturaLines, x + colunas[3].width / 2, y, {
      maxWidth: colunas[3].width - 2,
      align: "center",
    });
    x += colunas[3].width;

    // Coluna Valor
    doc.text(valor, x + colunas[3].width - 1, y, {
      maxWidth: colunas[4].width - 2,
      align: "right",
    });

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);

    doc.line(tableX, rowEndY, tableX + tableWidth, rowEndY);

    x = tableX;
    colunas.forEach((col) => {
      doc.line(x, rowStartY, x, rowEndY);
      x += col.width;
    });
    doc.line(tableX + tableWidth, rowStartY, tableX + tableWidth, rowEndY);

    y += lineHeight;
  }

  // Rodapé final
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text("Licitalerta360 · Gestão de Licitações", margin, pageH - 6);

  return doc;
}

export function exportarLicitacoesPDF(licitacoes, titulo = "Licitações") {
  const doc = gerarDocLicitacoesPDF(licitacoes, titulo);
  if (!doc) {
    alert("Nenhuma licitação para exportar");
    return;
  }
  doc.save(`licitacoes-${Date.now()}.pdf`);
}