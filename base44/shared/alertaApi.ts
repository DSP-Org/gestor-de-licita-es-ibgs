import { secrets } from "base44:runtime";

const API_BASE = "https://alertalicitacao.com.br/api/v1/licitacoesAbertas/";

// Data no fuso de São Paulo no formato YYYY-MM-DD exigido pela API
function dataSP(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Retorna as datas de inserção que devem ser consultadas.
 * Consultar por data de inserção faz a API devolver SOMENTE licitações novas,
 * evitando pagar novamente por resultados já sincronizados.
 * Cobre também dias em que a sincronização falhou (limite de 3 dias).
 */
export function datasParaSincronizar(ultimaSincronizacao?: string): string[] {
  const hoje = dataSP(new Date());
  const datas: string[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const s = dataSP(d);
    // Ignora dias já cobertos por uma sincronização anterior
    if (ultimaSincronizacao && s < dataSP(new Date(ultimaSincronizacao))) continue;
    if (!datas.includes(s)) datas.push(s);
  }
  if (!datas.includes(hoje)) datas.push(hoje);
  return datas;
}

/**
 * A API sempre trata as palavras-chave como "qualquer uma" (expansivo).
 * No modo restritivo ("todas"), filtramos localmente exigindo que TODAS as
 * palavras positivas apareçam no título ou no objeto.
 */
export function filtrarPorTodasPalavras(licitacoes: any[], palavraChave?: string) {
  const termos = (palavraChave || "")
    .split(",")
    .map((p) => p.trim().replace(/^"|"$/g, "").toLowerCase())
    .filter((p) => p && !p.startsWith("-"));
  if (termos.length < 2) return licitacoes;
  return licitacoes.filter((l) => {
    const texto = `${l.titulo || ""} ${l.objeto || ""}`.toLowerCase();
    return termos.every((t) => texto.includes(t));
  });
}

export async function consultarAlertaLicitacao(filtros = {}) {
  const token = secrets.get("ALERTA_LICITACAO_TOKEN");
  if (!token) throw new Error("Token da API não configurado.");

  const params = new URLSearchParams();
  params.set("token", token);
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
    throw new Error(`Erro na API Alerta Licitação (${resp.status})`);
  }
  return resp.json();
}