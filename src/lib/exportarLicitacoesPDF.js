import { jsPDF } from "jspdf";
import { formatValor } from "@/components/licitacoes/LicitacaoCard";

export function exportarLicitacoesPDF(licitacoes, titulo = "Licitações") {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 18;

  // Cabeçalho
  doc.setFillColor(15, 15, 15);
  doc.roundedRect(margin, y, 10, 10, 2, 2, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 5, y + 4.5, 1.8, "S");
  doc.setLineWidth(0.5);
  doc.line(margin + 5, y + 2.7, margin + 5, y + 2);
  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 5, y + 6.8, 0.4, "F");

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Licitalerta360", margin + 13, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Gestão de licitações", margin + 13, y + 8);

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 13, pageW - margin, y + 13);
  y += 18;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(titulo, margin, y);
  y += 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`${licitacoes.length} licitação(ões) · Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, y);
  y += 6;

  // Colunas: ID, Título, Órgão, Local, Modalidade, Abertura, Valor
  const colWidths = [22, 70, 45, 40, 35, 28, 30];
  const colLabels = ["ID", "Título", "Órgão", "Local", "Modalidade", "Abertura", "Valor"];
  const tableW = colWidths.reduce((a, b) => a + b, 0);
  let x = margin;

  const drawHeader = () => {
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, tableW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    x = margin;
    colLabels.forEach((label, i) => {
      doc.text(label, x + 1, y, { maxWidth: colWidths[i] - 2 });
      x += colWidths[i];
    });
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 1.5, margin + tableW, y + 1.5);
    y += 5;
  };

  drawHeader();

  const esc = (s) => String(s ?? "").replace(/[^\x20-\x7EÀ-ÿ]/g, " ").trim();

  for (const l of licitacoes) {
    if (y > pageH - 16) {
      // Rodapé da página atual
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text("Licitalerta360 · Desenvolvido por Data5 Tecnologia", margin, pageH - 6);
      doc.addPage();
      y = 18;
      drawHeader();
    }

    const local = [l.uf, l.municipio].filter(Boolean).join(" · ") || "—";
    const vals = [
      esc(l.id_licitacao),
      esc(l.titulo),
      esc(l.orgao),
      esc(local),
      esc(l.tipo),
      esc(l.aberturaComHora || l.abertura),
      formatValor(l.valor),
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(40, 40, 40);
    x = margin;
    vals.forEach((val, i) => {
      const align = i === 6 ? "right" : "left";
      if (align === "right") {
        doc.text(val, x + colWidths[i] - 1, y, { maxWidth: colWidths[i] - 2, align: "right" });
      } else {
        doc.text(val, x + 1, y, { maxWidth: colWidths[i] - 2 });
      }
      x += colWidths[i];
    });
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.1);
    doc.line(margin, y + 2, margin + tableW, y + 2);
    y += 5;
  }

  // Rodapé final
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text("Licitalerta360 · Desenvolvido por Data5 Tecnologia — Todos os direitos reservados", margin, pageH - 6);

  doc.save(`licitacoes-${Date.now()}.pdf`);
}