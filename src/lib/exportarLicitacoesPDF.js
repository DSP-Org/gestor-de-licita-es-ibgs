import { jsPDF } from "jspdf";
import { formatValor } from "@/components/licitacoes/LicitacaoCard";

export function exportarLicitacoesPDF(licitacoes, titulo = "Licitações") {
  if (!licitacoes || licitacoes.length === 0) {
    alert("Nenhuma licitação para exportar");
    return;
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;
  let pageNum = 1;

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(titulo, margin, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total: ${licitacoes.length} licitações · ${new Date().toLocaleString("pt-BR")}`, margin, y);
    y += 5;
  };

  drawHeader();

  // Colunas principais focando no objeto
  const colunas = [
    { key: "objeto", label: "Objeto", width: 100, align: "left" },
    { key: "local", label: "Local", width: 30, align: "left" },
    { key: "abertura", label: "Abertura", width: 25, align: "center" },
    { key: "valor", label: "Valor", width: 25, align: "right" },
  ];

  const tableWidth = colunas.reduce((sum, col) => sum + col.width, 0);
  const tableX = margin;

  const drawTableHeader = () => {
    // Cabeçalho
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
    doc.line(tableX, y + 1.5, tableX + tableWidth, y + 1.5);
    y += 6;
  };

  drawTableHeader();

  const esc = (s) => String(s ?? "").replace(/[^\x20-\x7EÀ-ÿ]/g, " ").trim();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  // Processar dados
  for (const l of licitacoes) {
    const local = [l.uf, l.municipio].filter(Boolean).join(" · ") || "—";
    const objeto = esc(l.objeto);
    const abertura = esc(l.aberturaComHora || l.abertura || "—");
    const valor = formatValor(l.valor);

    // Calcular altura necessária baseada no número de linhas do objeto
    const splitObjetoLines = doc.splitTextToSize(objeto, colunas[0].width - 2);
    const linhasNecessarias = Math.max(splitObjetoLines.length, 1);
    const lineHeight = 3.5 * linhasNecessarias + 1;

    // Verificar espaço e quebrar página se necessário
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

    // Renderizar linha
    doc.setTextColor(40, 40, 40);
    let x = tableX;

    // Coluna Objeto (com quebra de texto completo)
    doc.text(splitObjetoLines, x + 1, y);
    x += colunas[0].width;

    // Outras colunas (alinhadas ao topo)
    doc.text(local, x + 1, y, { maxWidth: colunas[1].width - 2 });
    x += colunas[1].width;

    doc.text(abertura, x + colunas[2].width / 2, y, { maxWidth: colunas[2].width - 2, align: "center" });
    x += colunas[2].width;

    doc.text(valor, x + colunas[3].width - 1, y, { maxWidth: colunas[3].width - 2, align: "right" });

    // Linha divisória
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.1);
    doc.line(tableX, y + lineHeight - 1, tableX + tableWidth, y + lineHeight - 1);

    y += lineHeight;
  }

  // Rodapé final
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text("Licitalerta360 · Gestão de Licitações", margin, pageH - 6);

  doc.save(`licitacoes-${Date.now()}.pdf`);
}