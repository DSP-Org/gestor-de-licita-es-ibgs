import { formatValor } from "@/components/licitacoes/LicitacaoCard";

// Gera um arquivo .csv (compatível com Excel) a partir de uma lista de licitações.
export function exportarLicitacoesExcel(licitacoes, nomeArquivo = "licitacoes") {
  const colunas = ["ID", "Título", "Objeto", "Órgão", "UF", "Município", "Modalidade", "Abertura", "Valor", "Link"];

  const escapar = (valor) => {
    const texto = String(valor ?? "").replace(/"/g, '""');
    return `"${texto}"`;
  };

  const linhas = licitacoes.map((l) => [
    escapar(l.id_licitacao),
    escapar(l.titulo),
    escapar(l.objeto),
    escapar(l.orgao),
    escapar(l.uf),
    escapar(l.municipio),
    escapar(l.tipo),
    escapar(l.aberturaComHora || l.abertura),
    escapar(formatValor(l.valor)),
    escapar(l.link_externo || l.link),
  ]);

  const csv = [colunas.map(escapar).join(";"), ...linhas.map((linha) => linha.join(";"))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nomeArquivo}-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}