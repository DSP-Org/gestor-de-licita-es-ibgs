// Integração direta com o PNCP (Portal Nacional de Contratações Públicas).
// A API de CONSULTA do PNCP é pública — sem token/credencial (diferente da
// API de manutenção, que é só pra quem publica editais). Documentação:
// https://pncp.gov.br/api/consulta/swaggerui/index.html
//
// Diferença importante em relação ao Alerta Licitação: o PNCP exige a
// modalidade da contratação em toda consulta (não dá pra buscar "todas as
// modalidades" numa chamada só). Por isso mapeamos nossos códigos de
// modalidade (MODALIDADES em src/shared/alertaApi.js) pros códigos do PNCP e
// fazemos uma chamada por modalidade selecionada, em paralelo.

const PNCP_BASE = "https://pncp.gov.br/api/consulta";

// Nosso código de modalidade -> código(s) equivalente(s) no PNCP.
// Convite e Tomada de Preços foram extintos pela Lei 14.133/2021 e não têm
// correspondente no PNCP — ficam de fora da busca nessa fonte.
const MODALIDADE_NOSSO_PARA_PNCP: Record<string, number[]> = {
  "2": [4, 5],   // Concorrência (eletrônica + presencial)
  "3": [1, 13],  // Leilão (eletrônico + presencial)
  "5": [6],      // Pregão eletrônico
  "6": [8, 9],   // Dispensas e dispensas eletrônicas -> Dispensa + Inexigibilidade
  "8": [7],      // Pregão presencial
  "11": [10, 11, 12], // Chamamento público -> Manifestação de Interesse/Pré-qualificação/Credenciamento (aproximado)
};

// Caminho inverso, pra rotular o resultado com nosso próprio código de
// modalidade sempre que existir equivalência — mantém o filtro de
// modalidade funcionando igual pra item vindo do PNCP ou do Alerta Licitação.
const MODALIDADE_PNCP_PARA_NOSSO: Record<number, string> = {
  1: "3", 13: "3",
  4: "2", 5: "2",
  6: "5",
  7: "8",
  8: "6", 9: "6",
  10: "11", 11: "11", 12: "11",
};

function dataSPCompacta(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).replace(/-/g, "");
}

// O PNCP manda dataAberturaProposta já em horário de Brasília, sem offset
// explícito na string. Sem marcar isso, `new Date(...)` fica ambíguo — em
// alguns ambientes é lido como UTC, deslocando o horário em até 3h na hora de
// exibir. Anexar "-03:00" resolve pra qualquer lugar do app que leia esse
// campo depois (aqui e no cálculo de urgência no frontend).
function comOffsetBrasilia(iso?: string): string | null {
  if (!iso) return null;
  return /[+-]\d{2}:?\d{2}$|Z$/.test(iso) ? iso : `${iso}-03:00`;
}

function formatarDataHoraBR(iso?: string): string {
  const comOffset = comOffsetBrasilia(iso);
  if (!comOffset) return "";
  const d = new Date(comOffset);
  if (isNaN(d.getTime())) return "";
  const data = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const hora = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return `${data} ${hora}`;
}

// Normaliza um item do PNCP pro mesmo formato "cru" que o Alerta Licitação já
// devolve — assim o resto do app (ConsultaCache, Acervo Geral, materialização
// em Licitacao) não precisa saber de qual fonte o item veio.
function normalizarItemPNCP(item: any) {
  const numeroControle = item.numeroControlePNCP || "";
  const orgao = item.orgaoEntidade?.razaoSocial || "";
  const unidade = item.unidadeOrgao || {};
  const instrumento = item.tipoInstrumentoConvocatorioNome || "Edital";
  const numero = item.numeroCompra ? `${item.numeroCompra}/${item.anoCompra || ""}` : "";

  return {
    id_licitacao: `PNCP-${numeroControle}`,
    titulo: [orgao, `${instrumento} ${numero}`.trim()].filter(Boolean).join(" — "),
    objeto: item.objetoCompra || "",
    uf: unidade.ufSigla || "",
    municipio: unidade.municipioNome || "",
    municipio_IBGE: unidade.codigoIbge != null ? String(unidade.codigoIbge) : "",
    orgao,
    abertura_datetime: comOffsetBrasilia(item.dataAberturaProposta),
    abertura: formatarDataHoraBR(item.dataAberturaProposta),
    tipo: item.modalidadeNome || "",
    id_tipo: MODALIDADE_PNCP_PARA_NOSSO[item.modalidadeId] || (item.modalidadeId != null ? String(item.modalidadeId) : ""),
    valor: item.valorTotalEstimado != null ? String(item.valorTotalEstimado) : "",
    link: item.orgaoEntidade?.cnpj && item.anoCompra && item.sequencialCompra
      ? `https://pncp.gov.br/app/editais/${item.orgaoEntidade.cnpj}/${item.anoCompra}/${item.sequencialCompra}`
      : "",
    linkExterno: item.linkSistemaOrigem || "",
  };
}

async function consultarPNCPModalidade(filtros: any, codigoModalidade: number) {
  const params = new URLSearchParams();
  // Sem data_insercao: busca o que está com propostas abertas HOJE (equivalente
  // a "licitações abertas"). Com data_insercao: busca publicadas naquele dia
  // específico (usado pela sincronização diária, mesma semântica do Alerta Licitação).
  let caminho: string;
  if (filtros.data_insercao) {
    const dataAlvo = String(filtros.data_insercao).replace(/-/g, "");
    caminho = "/v1/contratacoes/publicacao";
    params.set("dataInicial", dataAlvo);
    params.set("dataFinal", dataAlvo);
  } else {
    caminho = "/v1/contratacoes/proposta";
    params.set("dataFinal", dataSPCompacta(new Date()));
  }
  params.set("codigoModalidadeContratacao", String(codigoModalidade));
  if (filtros.uf) params.set("uf", filtros.uf);
  if (filtros.municipio_ibge) params.set("codigoMunicipioIbge", String(filtros.municipio_ibge));
  params.set("pagina", String(filtros.pagina || 1));
  // PNCP exige tamanhoPagina entre 10 e 500.
  params.set("tamanhoPagina", String(Math.min(Math.max(filtros.licitacoesPorPagina || 50, 10), 500)));

  const resp = await fetch(`${PNCP_BASE}${caminho}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (resp.status === 204) return { data: [], totalPaginas: 1 };
  if (!resp.ok) throw new Error(`Erro na API PNCP (${resp.status})`);
  return resp.json();
}

// Mesmo formato de retorno de consultarAlertaLicitacao/buscarLicitacoesApi:
// { licitacoes, totalLicitacoes, licitacoesNestaPagina, paginas, totalErros, erros }
export async function consultarPNCP(filtros: any = {}) {
  const codigosPedidos = String(filtros.modalidade || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .flatMap((c) => MODALIDADE_NOSSO_PARA_PNCP[c] || []);
  const codigos = [...new Set(codigosPedidos)];

  if (codigos.length === 0) {
    throw new Error(
      "O PNCP exige ao menos uma modalidade na busca. Selecione uma modalidade compatível (Concorrência, Leilão, Pregão eletrônico/presencial, Dispensas ou Chamamento público)."
    );
  }

  const ufs = String(filtros.uf || "").split(",").map((uf) => uf.trim()).filter(Boolean);
  const municipios = String(filtros.municipio_ibge || "").split(",").map((ibge) => ibge.trim()).filter(Boolean);
  const escopos = municipios.length > 0
    ? municipios.map((municipio_ibge) => ({ ...filtros, municipio_ibge }))
    : (ufs.length > 0 ? ufs.map((uf) => ({ ...filtros, uf })) : [filtros]);

  const respostas = await Promise.all(
    escopos.flatMap((escopo) =>
      codigos.map((codigo) =>
        consultarPNCPModalidade(escopo, codigo).catch((e) => ({
          erro: e instanceof Error ? e.message : String(e),
          data: [],
        }))
      )
    )
  );

  const erros = respostas
    .filter((r: any) => r.erro)
    .map((r: any) => ({ codigo: "PNCP_ERRO", descricao: r.erro }));

  const vistos = new Set<string>();
  const licitacoes: any[] = [];
  let totalPaginas = 1;
  for (const r of respostas as any[]) {
    for (const item of r.data || []) {
      const norm = normalizarItemPNCP(item);
      if (vistos.has(norm.id_licitacao)) continue;
      vistos.add(norm.id_licitacao);
      licitacoes.push(norm);
    }
    totalPaginas = Math.max(totalPaginas, r.totalPaginas || 1);
  }

  return {
    licitacoes,
    totalLicitacoes: licitacoes.length,
    licitacoesNestaPagina: licitacoes.length,
    paginas: totalPaginas,
    totalErros: erros.length,
    erros,
  };
}