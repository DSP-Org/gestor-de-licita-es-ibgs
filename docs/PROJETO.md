# Contexto do Projeto — Gestor de Licitações IBGS

> Documento de referência para retomar o trabalho neste projeto sem depender do
> histórico de chat. Escrito para o Claude (ou qualquer agente) que abrir uma
> conversa nova aqui. Mantenha atualizado quando decisões estruturais mudarem —
> não é histórico de mudanças (isso é o `git log`), é o retrato do "como
> funciona hoje".

## O que o sistema faz

App "Licitalerta360": monitora licitações públicas brasileiras a partir da API
externa **Alerta Licitação** (`alertalicitacao.com.br`), permite que usuários
salvem buscas recorrentes (UF, palavra-chave, modalidade, município), roda
sincronização automática por cron e notifica por e-mail/Telegram quando
aparecem licitações novas. Também funciona como banco/CRM de licitações:
favoritar, organizar em listas, marcar status de gestão (interessado,
participando, ganha, perdida...), compartilhar resultados por link público.

## Stack

- **Frontend**: React + Vite, shadcn/ui (`components.json`), Tailwind. Código em `src/`.
- **Backend**: plataforma **Base44** (BaaS) — entidades declarativas
  (`base44/entities/*.jsonc`), funções serverless (`base44/functions/*/entry.ts`,
  Deno), workflows/cron (`base44/workflows/*.jsonc`), agente de IA
  (`base44/agents/*.jsonc`).
- Não há banco relacional próprio: tudo é entidade Base44 com RLS declarativo
  (regras `rls` no `.jsonc` de cada entidade, comparando `data.<campo>` com
  `{{user.data.<campo>}}`).
- Dev local: `base44 dev` (backend + frontend juntos) ou `npm run dev`
  (frontend contra backend hospedado, precisa de `.env.local` com
  `VITE_BASE44_APP_ID`/`VITE_BASE44_APP_BASE_URL`). Publicar: `base44 dashboard open`.
- Ver [AGENTS.md](../AGENTS.md) para convenções Base44 gerais (esse arquivo é o
  "manual da plataforma"; este `PROJETO.md` é o "manual deste projeto
  específico").

## Multi-tenancy: unidade de negócio

Migração feita (ver commits `4bdea15`, `502002e`, `98f1aa2`): dados deixaram de
pertencer a um usuário individual e passaram a pertencer a uma
**UnidadeNegocio** (empresa/organização). Qualquer usuário da mesma unidade
enxerga os mesmos dados.

- Entidade `UnidadeNegocio` ([base44/entities/UnidadeNegocio.jsonc](../base44/entities/UnidadeNegocio.jsonc)): só tem `nome`. Só o master cria/edita/apaga.
- `User.unidade_negocio_id`: unidade **ativa** no momento — é o campo que o RLS compara. Só pode ser trocado via função [`trocarUnidadeAtiva`](../base44/functions/trocarUnidadeAtiva/entry.ts) (valida que a nova unidade está em `unidades_negocio_ids`), não editável livremente pelo usuário.
- `User.unidades_negocio_ids`: lista de unidades às quais o usuário *pode* pertencer/alternar (um usuário pode estar em mais de uma — feature adicionada depois da migração inicial, commit `502002e`).
- 4 entidades "com dono" usam `unidade_negocio_id` para RLS: `Licitacao`, `BuscaSalva`, `FavoritaLista`, `Destinatario`. Todas têm regra `read/create/update/delete`: `data.unidade_negocio_id === user.data.unidade_negocio_id` OU usuário é o master.
- `usuario_id`/`created_by_id` continuam nos schemas como campo legado/informativo (quem originalmente criou/é dono para fins de notificação padrão), **não controlam mais acesso**.
- **Master**: `nailton.alsampaio@gmail.com` (hardcoded nas regras RLS de várias entidades) — bypassa RLS, pode ver/editar tudo, único que cria/edita `UnidadeNegocio`.
- Migração de dados antigos (usuário → unidade): função [`migrarUnidadesNegocio`](../base44/functions/migrarUnidadesNegocio/entry.ts), disparada por botão em `Usuarios.jsx`. Escrita em massa — não rodar sem confirmação explícita do usuário.
- No frontend: `src/lib/escopoUnidade.js` + `src/lib/UnidadeFilterContext.jsx` (hook `useUnidadeFilter`) — trocam o antigo `escopoUsuario.js`/`UserFilterContext.jsx`. Seletor de unidade fica no Layout (era "escolher usuário", virou "escolher unidade" para o master).
  - Master: rótulo "Visualizando", com "Todas as unidades" + 1 opção por unidade; troca é só recorte local (`setFiltroUnidade`), não persiste.
  - Usuário comum: só aparece se ele pertencer a ≥1 unidade. Com exatamente 1, mostra o nome como texto fixo (sem dropdown). Com 2+, dropdown funcional que persiste via [`trocarUnidadeAtiva`](../base44/functions/trocarUnidadeAtiva/entry.ts).
  - `UnidadeFilterContext` expõe `recarregarUnidades()` — precisa ser chamado por qualquer tela que crie/edite/exclua uma `UnidadeNegocio` (hoje só [Usuarios.jsx](../src/pages/Usuarios.jsx)), senão o seletor do Layout fica com a lista velha até reload da página (a lista de unidades é carregada só uma vez no mount do provider).
- Exclusão de `UnidadeNegocio`: botão em [Usuarios.jsx](../src/pages/Usuarios.jsx), visível só pro master (RLS de `delete` já restringe ao master mesmo sem o botão). Hoje só avisa quantos usuários ficam vinculados a uma unidade fantasma — não bloqueia nem desvincula nada automaticamente. Foi exatamente uma exclusão assim (de fora desta sessão) que causou o bug descrito abaixo.

### Bug ativo: vínculo de unidade quebrado para todos os usuários comuns (não corrigido)

Diagnosticado em 2026-09-03, ainda não corrigido em produção.

- Só existe **1** `UnidadeNegocio` real: "IBGR - Licitações" (`6a98c63939159bbbf678d767`).
- **Nenhum dos 9 usuários** (master incluído) aponta pra ela — cada um tem `unidade_negocio_id`/`unidades_negocio_ids` referenciando um ID de unidade que já foi apagada (sobra de uma migração/limpeza anterior, provavelmente de quando `migrarUnidadesNegocio` criava 1 unidade por usuário).
- Quase nenhum dado está vinculado a nenhuma unidade: `Licitacao` ~4999/5000 com `unidade_negocio_id: null`, `BuscaSalva` 22/23, `FavoritaLista` 2/2, `Destinatario` 8/8. Os poucos registros vinculados apontam pra uma unidade fantasma, não pra "IBGR - Licitações".
- Efeito prático: usuários comuns não enxergam quase nada via RLS hoje (RLS compara igualdade exata, não resolve `null` nem uma unidade inexistente). Só o master vê tudo porque bypassa RLS.
- **Não rodar `migrarUnidadesNegocio` pra resolver isso** — ela cria uma unidade nova por usuário sem `unidade_negocio_id` (e todos já têm um valor, só que inválido), então re-fragmentaria em vez de consolidar.
- Fix já escrito e validado (dry-run confirmou os alvos) em [scripts/corrigir_vinculo_unidade.ts](../scripts/corrigir_vinculo_unidade.ts): repontam os 9 usuários + linkam via `updateMany` em loop todo registro órfão/fantasma nas 4 entidades pra "IBGR - Licitações". Rodar com `cat scripts/corrigir_vinculo_unidade.ts | base44 exec --privileged`.
- **Ainda não executado**: o classificador de segurança do Claude Code bloqueia esse comando por ser escrita em massa em produção sem uma confirmação explícita "nomeando" o escopo (tabelas + quantidade + unidade-alvo) — um "sim, pode rodar" genérico no chat não passa. Precisa ser rodado manualmente pelo usuário, ou reautorizado de forma bem explícita numa sessão futura.
- Ferramenta paliativa já construída em [BancoLicitacoes.jsx](../src/pages/BancoLicitacoes.jsx) (aba "Novas"): checkbox "Sem unidade" (só master) troca a consulta pra trazer até 5000 `Licitacao` com `unidade_negocio_id` vazio ignorando status/oculto, e com itens selecionados aparece um seletor "Atribuir à unidade..." + botão que vincula em lote (500 por chamada via `bulkUpdate`). Cobre só `Licitacao` — os outros 3 registros pequenos (`BuscaSalva`/`FavoritaLista`/`Destinatario`) não têm UI equivalente, resolvem via o script acima.

## Entidades (`base44/entities/`)

| Entidade | Papel | Dono/RLS |
|---|---|---|
| `Licitacao` | Registro de uma licitação (sincronizada ou salva manualmente). Campo `oculto` = soft delete ("descartar"); hard delete só admin. `status_leitura` (nova/vista/lida). | `unidade_negocio_id` |
| `BuscaSalva` | Busca recorrente configurada pelo usuário (filtros + canais de notificação + `horario_sincronizacao`). | `unidade_negocio_id` |
| `FavoritaLista` | Lista nomeada para organizar favoritos (cor, ordem). | `unidade_negocio_id` |
| `Destinatario` | Agenda de e-mails para notificação de buscas. | `unidade_negocio_id` |
| `ConsultaCache` | Cache bruto de respostas da API Alerta Licitação, chave = filtros+data+página. Compartilhado entre todas as unidades/usuários. | leitura aberta a todos; escrita só admin/service role |
| `UnidadeNegocio` | Empresa/organização (multi-tenant). | só master |
| `ResultadoCompartilhado` | Snapshot de um lote de licitações novas, acessível por link público `/compartilhar/:codigo`. | sem RLS restritivo (é público por design) |
| `User` | Usuário da plataforma (`role`: admin/user; `approval_status`: pending/approved/rejected — cadastro exige aprovação). | leitura aberta, update só master |

## Sincronização automática — como funciona hoje

Peça central: [base44/functions/sincronizarBuscas/entry.ts](../base44/functions/sincronizarBuscas/entry.ts),
disparada pelo workflow [`Sincronizacao Diaria.jsonc`](../base44/workflows/Sincronizacao%20Diaria.jsonc)
(cron `0 6,9,12,15,18 * * 1-5`, America/Sao_Paulo) e também pelo botão de
sincronização manual na UI (que passa `buscaId`/`buscaIds` no payload).

**Quem processa:**
- Sem `buscaIds` no payload (disparo do cron): processa todas as `BuscaSalva` ativas cujo `horario_sincronizacao` bate com a hora atual em SP. Se você adicionar um novo horário ao cron, precisa também adicionar em `HORARIOS_SINCRONIZACAO` (`src/shared/alertaApi.js`) para aparecer como opção na UI.
- Com `buscaIds` (botão manual): ignora o filtro de horário — roda a qualquer hora, só nas buscas selecionadas. Usuário comum só sincroniza buscas da própria unidade; admin sincroniza qualquer uma.
- Cooldown de 5 min por busca (usa `ultima_sincronizacao`), pulado se `payload.force === true`.

**Período de datas buscado** (`datasParaSincronizar` em [base44/shared/alertaApi.ts](../base44/shared/alertaApi.ts:16)):
- Consulta por **data de inserção** na API (não data de publicação real — a API não fornece essa data; carimbamos `data_publicacao` no banco com a própria data de inserção pedida).
- Sem `ultima_sincronizacao` (busca nova): consulta hoje-2, hoje-1, hoje (3 dias fixos).
- Com `ultima_sincronizacao`: pula dias já cobertos, mas sempre reconsulta o dia da última sync + hoje. **Teto de 3 dias de retrocesso** — se uma busca ficar mais de 3 dias sem rodar, licitações inseridas nesse intervalo "cego" nunca são recuperadas retroativamente. Decisão consciente/aceita (não é bug a corrigir agora).
- Paginação travada em 5 páginas × 100/página = máx. 500 resultados por dia por busca; excedente é descartado silenciosamente (risco só em buscas muito amplas). Confirmado ativo em 2026-09-03: a busca real "Atualização - MG" (UF=MG, sem palavra-chave) tinha 519 resultados no dia segundo a própria API, ou seja, já perdia ~19/dia. Testei a API ao vivo (`data_insercao` em dias diferentes = conjuntos de IDs sem sobreposição, contagens diferentes) — o filtro de data é respeitado corretamente, não é bug da API.
- Mitigação pro caso "Atualização - MG" (busca ampla sem quase filtro nenhum): [BuscaForm.jsx](../src/components/buscas/BuscaForm.jsx) agora exige UF preenchido + pelo menos 2 critérios no total (UF conta como 1) antes de salvar uma `BuscaSalva`. Só vale daqui pra frente — não corrige buscas já salvas fora dessa regra.

**Deduplicação** (linhas ~107-119 do entry.ts): filtra no banco os `id_licitacao` já existentes **na mesma unidade_negocio_id** antes de criar. Efeitos:
- Escopo é por unidade, não por busca: se duas buscas da mesma unidade encontram a mesma licitação, só a primeira a rodar cria o registro (fica com `busca_origem` dela); a segunda não duplica nem notifica de novo.
- Descarte (`oculto: true`, soft delete via `BancoLicitacoes.jsx`) é respeitado — item descartado continua "existente" para o dedupe, não reaparece como novo.
- Exclusão definitiva (hard delete, só admin) **pode ressuscitar** o registro: como o `ConsultaCache` guarda respostas de dias passados por até 365 dias, se a mesma licitação cair de novo dentro da janela de 3 dias de alguma sync futura, ela não estará mais em `existentes` e volta a ser criada + notificada. Edge case conhecido, não corrigido ainda.

**Cache** ([base44/shared/consultaCache.ts](../base44/shared/consultaCache.ts)): compartilhado entre todas as buscas/usuários/unidades (chave = filtros exatos, não inclui unidade). TTL 15 min para o dia de hoje (ainda recebe inserções), 365 dias para dias passados (não mudam mais). Se a API falhar, cai para o último resultado em cache conhecido em vez de quebrar.

**Após encontrar novas**: cria `Licitacao`, cria snapshot em `ResultadoCompartilhado` (gera link `/compartilhar/:codigo`), envia e-mail (destinatários da busca ou dono, template HTML) e/ou Telegram (`telegram_chats`), e atualiza `ultima_sincronizacao`/`total_encontrado` na `BuscaSalva`.

Busca manual avulsa (não-recorrente) usa outra função,
[buscarLicitacoesApi](../base44/functions/buscarLicitacoesApi/entry.ts), que
aceita `data_inicio`/`data_fim` arbitrários (até 31 dias) — não tem o teto de
3 dias porque não depende de `ultima_sincronizacao`.

## Outras funções backend (`base44/functions/`)

- `buscarLicitacoesApi`: busca sob demanda (UI de busca avançada), intervalo de datas livre até 31 dias, usa o mesmo cache.
- `salvarLicitacaoNoBanco`: alimenta o banco compartilhado ao salvar manualmente um resultado de busca avulsa.
- `enviarEmailResultados` / `buscarResultadoCompartilhado`: suportam a página pública de compartilhamento.
- `trocarUnidadeAtiva`: troca `User.unidade_negocio_id`, validando pertencimento em `unidades_negocio_ids`.
- `migrarUnidadesNegocio`: migração one-off de dados legados (usuário → unidade), disparo manual protegido.

## Integrações externas

- **Alerta Licitação API** (`base44/shared/alertaApi.ts`): fonte de dados das licitações. Requer `ALERTA_LICITACAO_TOKEN` (secret).
- **E-mail**: `base44.asServiceRole.integrations.Core.SendEmail` (destinatários internos) + `base44/shared/email.ts` (`enviarEmailExterno`, para destinatários fora do sistema).
- **Telegram**: `base44/shared/telegram.ts`, via `telegram_chats` configurado na busca.

## Páginas principais (`src/pages/`)

- `BancoLicitacoes.jsx`: banco/acervo principal, abas Novas/Favoritas/etc., descartar/favoritar/excluir.
- `BuscaAvancada.jsx`: busca avulsa com filtros e intervalo de datas.
- `Configuracao.jsx`: CRUD de `BuscaSalva` (buscas salvas recorrentes).
- `Usuarios.jsx` / `Administrador.jsx`: gestão de usuários/unidades, aprovação de cadastro, botão de migração.
- `Assistente.jsx`: chat com o agente de IA (`base44/agents/assistente_licitalerta.jsonc`).
- `ResultadoCompartilhado.jsx`: página pública de link compartilhado.
- `LicitacaoDetalhe.jsx`: detalhe de uma licitação.

## Convenções e pontos de atenção

- Comentários no código em português, explicando o "porquê" (não o "o quê") — seguir esse padrão em edições.
- RLS é a única linha de defesa de acesso — qualquer campo novo em entidade "com dono" precisa entrar na regra `$or` de `unidade_negocio_id` + bypass do master, senão fica sem controle de acesso.
- Mudança de schema (`.jsonc`) local não basta: precisa publicar via fluxo Base44 (`base44 dashboard open`) para valer no backend hospedado.
- Documentação antiga (análises, guias, checklists de uma fase anterior do projeto) foi movida para `docs/historico/` — pode conter informações desatualizadas (ex.: um dos arquivos lá descreve o dedupe filtrando só por `usuario_id`, que não é mais como funciona). Preferir sempre ler o código atual a confiar nesses arquivos.

## Memória do agente (fora do repo)

Além deste arquivo, há memória persistente do Claude em
`C:\Users\Nailton\.claude\projects\...\memory\` (não versionada, não vai para
o git, específica desta máquina) com notas sobre preferências de colaboração e
histórico de decisões entre sessões. Este `docs/PROJETO.md` é o que sobrevive
a troca de máquina/perda de memória local — mantenha os dois em sintonia
quando decisões estruturais mudarem.
