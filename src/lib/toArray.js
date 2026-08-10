// Garante que respostas de listagem sejam sempre um array,
// mesmo quando a API retorna um objeto de envelope.
export function toArray(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  return [];
}