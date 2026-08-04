import { secrets } from "base44:runtime";

const API_BASE = "https://alertalicitacao.com.br/api/v1/licitacoesAbertas/";

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