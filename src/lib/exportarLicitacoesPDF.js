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
    { key: "titulo", label: "Objeto", width: 100, align: "left" },
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

  // Processar dados
  for (const l of licitacoes) {
    // Verificar espaço
    if (y > pageH - 12) {
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

    const local = [l.uf, l.municipio].filter(Boolean).join(" · ") || "—";
    const rowData = [
      esc(l.titulo),
      esc(local),
      esc(l.aberturaComHora || l.abertura || "—"),
      formatValor(l.valor),
    ];

    // Renderizar linha com quebra de texto para objeto longo
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);

    let x = tableX;
    const lineHeight = 4;
    const startY = y;

    colunas.forEach((col, idx) => {
      const val = rowData[idx];
      const align = col.align;

      if (align === "right") {
        doc.text(val, x + col.width - 1, y, { maxWidth: col.width - 2, align: "right" });
      } else if (align === "center") {
        doc.text(val, x + col.width / 2, y, { maxWidth: col.width - 2, align: "center" });
      } else {
        // Para a coluna de Objeto, permitir quebra de linhas
        const splitText = doc.splitTextToSize(val, col.width - 2);
        doc.text(splitText, x + 1, y, { maxWidth: col.width - 2 });
      }
      x += col.width;
    });

    // Linha divisória
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.1);
    doc.line(tableX, y + 2, tableX + tableWidth, y + 2);

    y += lineHeight;
  }

  // Rodapé final
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text("Licitalerta360 · Gestão de Licitações", margin, pageH - 6);

  doc.save(`licitacoes-${Date.now()}.pdf`);
}