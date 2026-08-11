import { jsPDF } from "jspdf";
import { formatValor } from "@/components/licitacoes/LicitacaoCard";

export function exportarLicitacoesPDF(licitacoes, titulo = "Licitações") {
  if (!licitacoes || licitacoes.length === 0) {
    alert("Nenhuma licitação para exportar");
    return;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const primaryColor = [0, 102, 255]; // #0066FF
  const darkColor = [30, 30, 30];
  const lightGray = [245, 247, 250];
  const borderColor = [220, 220, 220];

  let y = margin;
  let pageNum = 1;

  const drawPageHeader = () => {
    // Logo/Cabeçalho
    doc.setFillColor(...lightGray);
    doc.rect(margin, margin, pageW - 2 * margin, 18, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text("Licitalerta360", margin + 4, margin + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Relatório de Licitações", margin + 4, margin + 13);

    // Data e página
    doc.setFontSize(8);
    doc.text(`Página ${pageNum} · ${new Date().toLocaleString("pt-BR")}`, pageW - margin - 50, margin + 8);

    y = margin + 20;
  };

  drawPageHeader();

  // Título e resumo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkColor);
  doc.text(titulo, margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const resumo = `Total: ${licitacoes.length} licitação(ões) · Valor total: ${formatValor(licitacoes.reduce((sum, l) => sum + (l.valor || 0), 0))}`;
  doc.text(resumo, margin, y);
  y += 5;

  // Definir colunas baseado em dados reais
  const colunas = [
    { key: "id_licitacao", label: "ID", width: 18, align: "left" },
    { key: "titulo", label: "Título", width: 50, align: "left" },
    { key: "orgao", label: "Órgão", width: 35, align: "left" },
    { key: "local", label: "Local", width: 30, align: "left" },
    { key: "tipo", label: "Modalidade", width: 30, align: "left" },
    { key: "abertura", label: "Abertura", width: 22, align: "center" },
    { key: "valor", label: "Valor", width: 28, align: "right" },
  ];

  const tableWidth = colunas.reduce((sum, col) => sum + col.width, 0);
  const tableX = margin;

  const drawTableHeader = () => {
    // Cabeçalho da tabela
    doc.setFillColor(...primaryColor);
    doc.rect(tableX, y - 4, tableWidth, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    let x = tableX;
    colunas.forEach((col) => {
      const align = col.align === "right" ? "right" : "left";
      doc.text(col.label, x + (align === "right" ? col.width - 1 : 1), y, {
        maxWidth: col.width - 2,
        align,
      });
      x += col.width;
    });

    y += 7;
  };

  drawTableHeader();

  const esc = (s) => String(s ?? "").replace(/[^\x20-\x7EÀ-ÿ]/g, " ").trim().substring(0, 100);

  // Processar dados
  for (const l of licitacoes) {
    // Verificar espaço e adicionar página se necessário
    if (y > pageH - 14) {
      // Rodapé
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Licitalerta360 · Gestão de Licitações", margin, pageH - 6);

      doc.addPage();
      pageNum++;
      y = margin;
      drawPageHeader();
      drawTableHeader();
    }

    // Dados da linha
    const local = [l.uf, l.municipio].filter(Boolean).join(" · ") || "—";
    const rowData = [
      esc(l.id_licitacao),
      esc(l.titulo),
      esc(l.orgao),
      esc(local),
      esc(l.tipo),
      esc(l.aberturaComHora || l.abertura || "—"),
      formatValor(l.valor),
    ];

    // Renderizar linha
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...darkColor);

    let x = tableX;
    colunas.forEach((col, idx) => {
      const val = rowData[idx];
      const align = col.align;
      doc.text(val, x + (align === "right" ? col.width - 1 : 1), y, {
        maxWidth: col.width - 2,
        align,
      });
      x += col.width;
    });

    // Linha divisória
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.1);
    doc.line(tableX, y + 2, tableX + tableWidth, y + 2);

    y += 5;
  }

  // Rodapé final
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("Licitalerta360 · Gestão de Licitações", margin, pageH - 6);

  // Salvar
  const timestamp = new Date().toISOString().split("T")[0];
  doc.save(`licitacoes-${timestamp}.pdf`);
}