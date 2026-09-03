// Script pontual (não deployado, não é uma função do app) para corrigir o
// estado de dados descrito em docs/PROJETO.md, seção "Bug ativo: vínculo de
// unidade quebrado". Rodar manualmente quando for a hora de aplicar o fix:
//
//   cat scripts/corrigir_vinculo_unidade.ts | base44 exec --privileged
//
// Pré-condição que o script verifica sozinho: precisa existir EXATAMENTE 1
// UnidadeNegocio real no momento da execução (se surgir uma segunda unidade
// legítima antes de rodar isso, o script aborta sem alterar nada — reavalie
// a lógica de escolha da unidade-alvo nesse caso).
//
// O que faz:
// 1) Repontar User.unidade_negocio_id + unidades_negocio_ids de todos os
//    usuários para a unidade real (hoje eles apontam para IDs de unidades já
//    apagadas — sobra de uma migração/limpeza anterior).
// 2) Vincular à mesma unidade todo registro de Licitacao, BuscaSalva,
//    FavoritaLista e Destinatario que hoje não aponta para ela (nulo ou
//    apontando para uma unidade fantasma), via updateMany em loop até
//    has_more esgotar — seguro mesmo se o total real passar do teto de
//    leitura de 5000 da API.
//
// Diagnóstico que motivou isso (rodado em 2026-09-03): só existe 1
// UnidadeNegocio real ("IBGR - Licitações"); os 9 usuários e quase todos os
// registros das 4 entidades com dono não apontavam para ela. Efeito prático:
// usuários comuns não enxergavam quase nada via RLS, só o master (que
// ignora RLS) via tudo.

const unidades = await base44.entities.UnidadeNegocio.list();
if (unidades.length !== 1) {
  throw new Error(`Esperado exatamente 1 unidade, encontrado ${unidades.length}. Abortando sem alterar nada.`);
}
const UNIDADE_ID = unidades[0].id;
console.log("Unidade alvo:", unidades[0].nome, UNIDADE_ID);

// 1) Usuarios: repontar unidade_negocio_id + unidades_negocio_ids
const usuarios = await base44.entities.User.list('-created_date', 1000);
let usuariosCorrigidos = 0;
for (const u of usuarios) {
  if (
    u.unidade_negocio_id === UNIDADE_ID &&
    Array.isArray(u.unidades_negocio_ids) &&
    u.unidades_negocio_ids.length === 1 &&
    u.unidades_negocio_ids[0] === UNIDADE_ID
  ) {
    continue; // já correto
  }
  await base44.entities.User.update(u.id, { unidade_negocio_id: UNIDADE_ID, unidades_negocio_ids: [UNIDADE_ID] });
  usuariosCorrigidos++;
}
console.log(`Usuarios corrigidos: ${usuariosCorrigidos}/${usuarios.length}`);

// 2) Entidades com dono: vincular tudo que não aponta pra unidade real (null ou fantasma)
const entidades = ['Licitacao', 'BuscaSalva', 'FavoritaLista', 'Destinatario'];
const resumo: Record<string, { atualizados: number; iteracoes: number }> = {};
for (const nome of entidades) {
  let totalAtualizado = 0;
  let hasMore = true;
  let iteracoes = 0;
  while (hasMore && iteracoes < 50) {
    const r = await base44.entities[nome].updateMany(
      { unidade_negocio_id: { $ne: UNIDADE_ID } },
      { $set: { unidade_negocio_id: UNIDADE_ID } }
    );
    totalAtualizado += r.updated;
    hasMore = r.has_more;
    iteracoes++;
    if (r.updated === 0 && !hasMore) break;
  }
  resumo[nome] = { atualizados: totalAtualizado, iteracoes };
}
console.log("Resumo entidades:", JSON.stringify(resumo, null, 2));
