import { consultarAlertaLicitacao } from "./alertaApi.ts";

/**
 * Consulta a API Alerta Licitação reaproveitando resultados já buscados.
 * O cache é compartilhado entre todos os usuários e buscas — se duas buscas
 * usarem os mesmos filtros e data, a segunda reaproveita o resultado da
 * primeira em vez de consumir a API novamente.
 */
export async function consultarComCache(base44: any, filtros: any, ttlHoras = 24) {
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

  const resultado = await consultarAlertaLicitacao(filtros);
  const expira_em = new Date(Date.now() + ttlHoras * 3600000).toISOString();

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