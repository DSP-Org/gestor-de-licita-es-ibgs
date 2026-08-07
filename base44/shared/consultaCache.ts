import { consultarAlertaLicitacao } from "./alertaApi.ts";

/**
 * Consulta a API Alerta Licitação reaproveitando resultados já buscados.
 * O cache é compartilhado entre todos os usuários e buscas — se duas buscas
 * usarem os mesmos filtros e data, a segunda reaproveita o resultado da
 * primeira em vez de consumir a API novamente.
 */
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/**
 * Dias passados não recebem novas licitações — o resultado pode ser reaproveitado
 * por muito tempo. O dia de hoje ainda recebe inserções, então revalida rápido.
 */
function ttlPadrao(dataInsercao?: string) {
  if (!dataInsercao || dataInsercao >= hojeSP()) return 0.25; // 15 minutos
  return 24 * 7; // 7 dias
}

export async function consultarComCache(base44: any, filtros: any, ttlHoras?: number) {
  const ttl = ttlHoras ?? ttlPadrao(filtros.data_insercao);
  const chave = JSON.stringify({
    uf: filtros.uf || "",
    palavra_chave: filtros.palavra_chave || "",
    modalidade: filtros.modalidade || "",
    municipio_ibge: filtros.municipio_ibge || "",
    data_insercao: filtros.data_insercao || "",
    pagina: filtros.pagina || 1,
    licitacoesPorPagina: filtros.licitacoesPorPagina || 50,
  });

  const existentes = await base44.asServiceRole.entities.ConsultaCache.filter({ chave });
  const cache = existentes[0];
  if (cache && new Date(cache.expira_em) > new Date()) {
    return cache.resultado;
  }

  let resultado;
  try {
    resultado = await consultarAlertaLicitacao(filtros);
  } catch (e) {
    // Falha na API: entrega o último resultado conhecido em vez de quebrar a listagem.
    if (cache) return cache.resultado;
    throw e;
  }
  const expira_em = new Date(Date.now() + ttl * 3600000).toISOString();

  try {
    if (cache) {
      await base44.asServiceRole.entities.ConsultaCache.update(cache.id, { resultado, expira_em });
    } else {
      await base44.asServiceRole.entities.ConsultaCache.create({
        chave,
        uf: filtros.uf || "",
        palavra_chave: filtros.palavra_chave || "",
        modalidade: filtros.modalidade || "",
        municipio_ibge: filtros.municipio_ibge || "",
        data_insercao: filtros.data_insercao || "",
        pagina: filtros.pagina || 1,
        resultado,
        expira_em,
      });
    }
  } catch {
    // Se a gravação do cache falhar, ainda retornamos o resultado da API.
  }

  return resultado;
}