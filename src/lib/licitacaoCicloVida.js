/**
 * licitacaoCicloVida.js
 * 
 * Regras do funil e ciclo de vida das licitações:
 * 1. O banco geral armazena as licitações aplicáveis à unidade e suas buscas ativas.
 * 2. Aba "Novas": Oportunidades sincronizadas recentemente (com até 3 dias desde a chegada/sincronização)
 *    e que ainda não foram favoritadas nem descartadas (status_leitura === "nova").
 * 3. Aba "Em Triagem / Analisar": Transbordo automático. Se a licitação passou de 3 dias sem ação
 *    (não favoritada e não descartada) OU foi visualizada/aberta para análise (status_leitura in ["vista", "lida"]),
 *    ela vai e fica em Triagem até que alguém descarte ou favorite.
 * 4. Aba "Descartadas": Oportunidades marcadas como descartadas (oculto === true).
 * 5. Aba "Minhas / Favoritas": Oportunidades favoritadas (favorito === true).
 */

const DIAS_PADRAO_NOVAS = 3;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Verifica se a licitação foi recebida/sincronizada no sistema há até `dias` dias.
 * Avalia data_sincronizacao, created_date e data_publicacao em sequência de prioridade.
 */
export function ehLicitacaoRecente(licitacao, dias = DIAS_PADRAO_NOVAS) {
  if (!licitacao) return false;
  const agora = Date.now();
  const limiteMs = dias * MS_POR_DIA;
  const rawData = licitacao.data_sincronizacao || licitacao.created_date || licitacao.data_publicacao;
  if (!rawData) return true; // Se não houver data, trata defensivamente como recente
  const time = new Date(rawData).getTime();
  if (isNaN(time)) return true;
  return (agora - time) <= limiteMs;
}

/**
 * Resolve o estado exato da oportunidade no funil:
 * - "novas": recente (<= 3 dias) e status_leitura === "nova"
 * - "triagem": não favoritada, não descartada e (> 3 dias ou status_leitura in ["vista", "lida"] ou status === "em_analise")
 * - "descartadas": oculto === true
 * - "minhas": favorito === true
 * - "fora_do_funil": registro não cadastrado no banco da unidade (apenas consulta cache)
 */
export function resolverEstadoLicitacao(licitacao, licitacaoBanco = null) {
  const item = licitacaoBanco || licitacao;
  if (!item) return "fora_do_funil";
  if (item.oculto) return "descartadas";
  if (item.favorito) return "minhas";

  if (item.status_leitura === "nova" && ehLicitacaoRecente(item, DIAS_PADRAO_NOVAS)) {
    return "novas";
  }

  return "triagem";
}
