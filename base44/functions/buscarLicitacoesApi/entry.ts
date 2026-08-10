import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { consultarComCache } from "../../shared/consultaCache.ts";

function datasNoIntervalo(inicio: string, fim: string): string[] {
  const datas: string[] = [];
  const start = new Date(inicio + "T00:00:00-03:00");
  const end = new Date(fim + "T00:00:00-03:00");
  const limite = 31; // máximo de 31 dias por consulta
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

    // Período: percorre cada data do intervalo e consolida os resultados
    if (body.data_inicio && body.data_fim) {
      const datas = datasNoIntervalo(body.data_inicio, body.data_fim);
      const todas = [];
      let totalErros = 0;
      const erros = [];
      let paginas = 0;

      for (const data of datas) {
        const resultado = await consultarComCache(base44, { ...body, data_insercao: data, data_inicio: undefined, data_fim: undefined });
        if (resultado.totalErros > 0) {
          totalErros += resultado.totalErros;
          erros.push(...(resultado.erros || []));
        } else {
          todas.push(...(resultado.licitacoes || []));
          paginas = Math.max(paginas, resultado.paginas || 1);
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
    return Response.json({ error: error.message }, { status: 500 });
  }
}