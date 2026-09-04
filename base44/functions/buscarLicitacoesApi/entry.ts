import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { consultarComCache } from "../../shared/consultaCache.ts";

function validarData(data: string): boolean {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const d = new Date(data + "T00:00:00Z");
  return !isNaN(d.getTime());
}

function datasNoIntervalo(inicio: string, fim: string): string[] {
  if (!validarData(inicio) || !validarData(fim)) {
    throw new Error("Datas inválidas. Use formato YYYY-MM-DD");
  }

  const datas: string[] = [];
  const start = new Date(inicio + "T00:00:00-03:00");
  const end = new Date(fim + "T00:00:00-03:00");

  if (start > end) {
    throw new Error("data_inicio não pode ser após data_fim");
  }

  const limite = 31; // máximo de 31 dias por consulta
  const diffDias = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias > limite) {
    throw new Error(`Intervalo máximo é ${limite} dias (você pediu ${diffDias})`);
  }

  let count = 0;
  for (let d = new Date(start); d <= end && count < limite; d.setDate(d.getDate() + 1)) {
    datas.push(d.toISOString().split("T")[0]);
    count++;
  }
  return datas;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Período: percorre as datas do intervalo em paralelo com cache e consolida
    if (body.data_inicio && body.data_fim) {
      const datas = datasNoIntervalo(body.data_inicio, body.data_fim);
      let totalErros = 0;
      const erros = [];
      let paginas = 0;

      // Executa as consultas em paralelo para máxima velocidade
      const resultados = await Promise.all(
        datas.map((data) =>
          consultarComCache(base44, {
            ...body,
            data_insercao: data,
            data_inicio: undefined,
            data_fim: undefined,
          }).catch((err) => ({
            totalErros: 1,
            erros: [{ codigo: "FALHA_DATA", descricao: `Erro na data ${data}: ${err?.message || err}` }],
            licitacoes: [],
          }))
        )
      );

      const todas = [];
      for (const resultado of resultados) {
        if (resultado?.totalErros > 0) {
          totalErros += resultado.totalErros;
          erros.push(...(resultado.erros || []));
        } else {
          todas.push(...(resultado?.licitacoes || []));
          paginas = Math.max(paginas, resultado?.paginas || 1);
        }
      }

      // Deduplica por id_licitacao
      const vistos = new Set();
      const unicas = todas.filter((l) => {
        if (vistos.has(l.id_licitacao)) return false;
        vistos.add(l.id_licitacao);
        return true;
      });

      return Response.json({
        licitacoes: unicas,
        totalLicitacoes: unicas.length,
        licitacoesNestaPagina: unicas.length,
        paginas: 1,
        totalErros,
        erros,
      });
    }

    const data = await consultarComCache(base44, body);
    return Response.json(data);
  } catch (error) {
    const erroMsg = error instanceof Error ? error.message : String(error);
    console.error("[BuscarLicitacoesApi] Erro:", erroMsg);
    // Retorna 200 com o erro no corpo — se retornar 400, o SDK do frontend
    // só enxerga "Request failed with status code 400" e a mensagem real
    // (ex: "PNCP exige ao menos uma modalidade") se perde.
    return Response.json({ licitacoes: [], error: erroMsg });
  }
}