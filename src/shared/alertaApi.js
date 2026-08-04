// Token da API do Alerta Licitação (conta ibgs.saude@outlook.com).
// Como o plano atual não permite funções de backend, a consulta é feita
// pelo frontend. O token tem CIDR liberado (*) e o app exige login.
export const ALERTA_TOKEN = "f7164dfc71fe0cd2a9601c40f09675aa";

const API_BASE = "https://alertalicitacao.com.br/api/v1/licitacoesAbertas/";

export const MODALIDADES = [
  { id: "1", nome: "Convite" },
  { id: "2", nome: "Concorrência" },
  { id: "3", nome: "Leilão" },
  { id: "4", nome: "Tomada de preços" },
  { id: "5", nome: "Pregão eletrônico" },
  { id: "6", nome: "Dispensas e dispensas eletrônicas" },
  { id: "8", nome: "Pregão presencial" },
  { id: "11", nome: "Chamamento público" },
];

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

export const STATUS_OPTIONS = [
  { value: "interessado", label: "Interessado", color: "bg-blue-100 text-blue-700" },
  { value: "acompanhando", label: "Acompanhando", color: "bg-amber-100 text-amber-700" },
  { value: "participando", label: "Participando", color: "bg-purple-100 text-purple-700" },
  { value: "vencida", label: "Vencida", color: "bg-orange-100 text-orange-700" },
  { value: "ganha", label: "Ganha", color: "bg-green-100 text-green-700" },
  { value: "perdida", label: "Perdida", color: "bg-red-100 text-red-700" },
  { value: "descartada", label: "Descartada", color: "bg-gray-200 text-gray-600" },
];

export async function buscarLicitacoes(filtros = {}) {
  const params = new URLSearchParams();
  params.set("token", ALERTA_TOKEN);
  if (filtros.uf) params.set("uf", filtros.uf);
  if (filtros.palavra_chave) params.set("palavra_chave", filtros.palavra_chave);
  if (filtros.modalidade) params.set("modalidade", filtros.modalidade);
  if (filtros.municipio_ibge) params.set("municipio_ibge", filtros.municipio_ibge);
  if (filtros.data_insercao) params.set("data_insercao", filtros.data_insercao);
  params.set("pagina", String(filtros.pagina || 1));
  params.set("licitacoesPorPagina", String(Math.min(Math.max(filtros.licitacoesPorPagina || 50, 1), 100)));

  const resp = await fetch(`${API_BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) {
    throw new Error(`Erro na API (${resp.status})`);
  }
  return resp.json();
}