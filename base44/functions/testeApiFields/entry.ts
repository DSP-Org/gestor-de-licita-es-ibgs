import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";

const API_BASE = "https://alertalicitacao.com.br/api/v1/licitacoesAbertas/";

function dataSP(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const token = secrets.get("ALERTA_LICITACAO_TOKEN");
    if (!token) throw new Error("Token não configurado");

    // Busca licitações de hoje para ver todos os campos
    const hoje = dataSP(new Date());

    const params = new URLSearchParams();
    params.set("token", token);
    params.set("uf", "BA");
    params.set("data_insercao", hoje);
    params.set("pagina", "1");
    params.set("licitacoesPorPagina", "1");

    const resp = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!resp.ok) {
      return Response.json({ erro: `Status ${resp.status}`, body: await resp.text() }, { status: 500 });
    }

    const data = await resp.json();

    // Extrai os campos da primeira licitação
    const primeiraLicitacao = data.licitacoes?.[0];

    if (!primeiraLicitacao) {
      return Response.json({
        aviso: "Nenhuma licitação encontrada para hoje",
        filtros_usados: { uf: "BA", data_insercao: hoje }
      });
    }

    // Retorna todas as chaves da primeira licitação
    const campos = Object.keys(primeiraLicitacao).sort();
    const primeiroLicitacaoCompleto = primeiraLicitacao;

    return Response.json({
      campos_encontrados: campos,
      total_campos: campos.length,
      primeira_licitacao_completa: primeiroLicitacaoCompleto,
      data_teste: hoje,
    });
  } catch (error) {
    return Response.json({ erro: error.message }, { status: 500 });
  }
}
