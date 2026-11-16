# Equipe Data5 — Painel de Missão

> ⚠️ **STATUS ATUAL: SEM TRABALHO EM EQUIPE EM ANDAMENTO**

---

### 📢 Orientação para Todos os Agentes (Claude Code, AGY, Freebuff, etc.)

1. **Atendimento Direto e Individual:**
   - No momento **NÃO HÁ missão conjunta ou trabalho em equipe ativo**.
   - Cada agente deve seguir estritamente o fluxo, instruções e comandos passados **diretamente a ele pelo Sampaio** em sua sessão/chat individual.

2. **Isolamento de Contexto (Anti-Ruído):**
   - Não presuma tarefas pendentes de sprints ou conversas anteriores.
   - Não assuma LOCKs, restrições ou bloqueios sem ordem direta atual.
   - Responda e atue exclusivamente conforme a demanda pontual recebida em seu próprio terminal/conversa.

---

### 🛡️ Regra de Governança do Antigravity (Gestão Contínua)
- **Protocolo de Conclusão:** Sempre ao finalizar uma rodada de trabalho em equipe (ou ao suspender uma missão conjunta), o Antigravity é responsável por limpar este painel e deixar apenas a nota de liberação individual, garantindo que contextos ou discussões antigas nunca interfiram quando o Sampaio falar diretamente com cada agente.

---

## Claude Code — 2026-11-04 — Sync com origin/main + avaliação de saúde do repo

**Pedido do Sampaio:** fazer pull e avaliar o projeto.

**Sync realizado (merge, sem conflito):**
- Entraram 3 commits do remoto: `c572e22` (boilerplate auth templates), `4a3c67f` e `ef0b15f` (bump dos pacotes base44).
- `@base44/sdk` 0.8.48 → 0.8.58 e `@base44/vite-plugin` 1.0.36 → 1.0.50.
- Novo arquivo `src/lib/authMfa.js` (login com MFA + social login) — **boilerplate, nenhum import no projeto ainda**.
- Branch local ficou 2 commits à frente de origin/main (meu commit anterior de lockfile + o merge). **Push ainda não feito.**

**Avaliação:**
- `npm run build` ✅ passa (2302 módulos, 23s).
- `npm run lint` ❌ 32 erros, todos `unused-imports` (cosméticos, 100% auto-fixáveis com `npm run lint:fix`).
- **Achado relevante — código morto de feature real:** `KanbanFunil` está importado em `src/pages/MinhasLicitacoes.jsx` mas **nunca renderizado**. O state `modo` ainda documenta `"kanban"` (linha 58) e o comentário da linha 753 fala do Kanban, porém o toggle de visualização só oferece `cards` e `tabela`. O drag & drop de funil está inacessível na UI.
- Mesmo padrão em `FavoritasTab` (importado em `BancoLicitacoes.jsx`, não usado) — ali a aba "Selecionadas" foi reimplementada inline, então o componente ficou órfão.
- Bundle principal em 1.306 kB (gzip 401 kB) — acima do limite de 500 kB do Vite. `jspdf` é importado estático e dinâmico ao mesmo tempo, impedindo o code-split.
- `caniuse-lite` com 9 meses de atraso.

**Decisão pendente do Sampaio:** reativar o Kanban na UI ou remover de vez o componente? E autorizar o push dos 2 commits locais.

---

## Claude Code — 2026-11-13 — Licitalerta360 pronto para deploy (o deploy é do Antigravity)

**Atenção @Antigravity:** o relatório completo desta entrega está em
`ponte_claude/RETORNO_CLAUDE.md`. Resumo de uma linha: a ingestão do PNCP nunca
chegava em **Credenciamento** (última da fila, 1.217 registros, 210s contra 120s
de orçamento), então o acervo não tinha os editais do negócio do Sampaio.

- Acervo 1.578 → **3.013**; editais de varizes na Bahia **0 → 43**.
- Triagem por IA nos 1.243 candidatos: **46 relevantes** (R$ 82.653.487 em 41
  municípios), 200 para revisar, 998 descartadas. Angical fecha em 3 dias.
- Corrigidos 5 truncamentos silenciosos de 1.000 linhas do PostgREST.

**Já em produção, sem precisar de você:** 15 migrations (local = remoto) e 11
Edge Functions ACTIVE, conferidas ao vivo hoje.

**Falta só o frontend na VPS.** 6 commits em `main`, `npm run build` com zero
erro, service worker já subido para `v3`. **Os 6 commits ainda não foram
empurrados para o `origin`** — aguardando o OK do Sampaio.

**Limite declarado:** a tela mostra 995 de 1.296 vínculos (`carregarAtivas` pede
no máximo 1.000 e o shim do base44 não expõe offset). As 46 relevantes vêm
primeiro na ordenação, nenhuma cai fora. Correção certa é filtrar por veredito
no banco — refactor, não remendo.

**Nota de escopo:** este repo (`gestor-de-licita-es-ibgs`) não recebeu alteração
nenhuma. Todo o trabalho foi em `C:\Users\Nailton\dyad-apps\licitalerta360`.

---

## Claude Code — 2026-11-13 (tarde) — Funil em 5 baldes + correção de um limite que eu tinha declarado errado

A pedido do Sampaio, o veredito da IA virou porteiro nos DOIS sentidos. Antes ele
só tirava da fila o que a IA recusou; agora também adianta o que ela aprovou.

**Barra única, conferida ao vivo:** Atendem 46 · Para decidir 162 · Em análise 0
· Descartadas 826 · Selecionadas 0 · **Total 1034** — as partes fecham com o
total, que é a regra que mantém a estrutura honesta.

- **Atendem**: a IA aprovou e ninguém encostou. Abre a tela. Tem
  "Selecionar (46)" em massa — o clique continua humano, porque selecionar é
  `favorito=true` e alimenta o Kanban e o link `/compartilhar` do cliente.
- **Para decidir**: só dúvida de verdade — 200 incertas + **77 que a triagem
  nunca analisou** (achado da medição, não estava no radar).
- Vocabulário unificado: some "Favoritar"/"Minhas Licitações" (viraram
  "Selecionar") e "Em Triagem" (virou "Em análise").

**⚠️ CORREÇÃO DO RELATÓRIO DA MANHÃ.** Eu escrevi em `RETORNO_CLAUDE.md` que "as
46 relevantes vêm primeiro na ordenação, nenhuma cai fora" do corte de 1.000
linhas. **Estava errado.** A tela mostrava **35 das 46** — 11 editais aprovados,
com dinheiro e prazo em cima, invisíveis sem erro nenhum. Corrigido: as
aprovadas agora vêm numa consulta própria (46 linhas, longe do teto), feita em
paralelo com a do resto. O teto de 1.000 continua valendo para o resto.

Também removido o "transbordo automático" de 3 dias dentro do funil: ele
esvaziaria "Atendem" sozinho, mandando as aprovadas para "Em análise" sem
ninguém ter analisado nada.

**Estado:** lint 0 erros, `npm run build` ✓. Nada commitado, nada publicado.
Somando com a manhã: **6 commits sem push + estas alterações sem commit.**

---

## Claude Code — 2026-11-16 — Funil volta a 4 abas; veredito da IA vira recorte

Correção de rumo pedida pelo Sampaio, e ele tem razão: "Atendem" e "Para
decidir" **não eram etapas**. Nos dois casos ninguém encostou no edital — o que
os separava era só o parecer da máquina. Promovê-los a abas colocou a opinião da
IA no mesmo degrau das decisões humanas, que é a mesma raiz da confusão das duas
barras empilhadas.

**Estrutura final:** abas = **Novas · Em análise · Descartadas · Selecionadas**
(+ Total). O parecer da IA aparece como recorte DENTRO do balde onde ajuda:

- Novas → "Mostrar: Atendem / Para decidir / Todas"
- Descartadas → "Quem descartou: Todas / Pela IA / Por mim"

Os dois recortes agora são o **mesmo componente**
(`src/components/licitacoes/SubFiltro.jsx`; `FiltroDescarte.jsx` apagado) —
papéis iguais devem ser o mesmo código, senão divergem.

**Regra que o componente carrega escrita:** recorte é lente, não balde. Muda a
lista, nunca o número da aba. Conferido ao vivo: em Descartadas, clicar em
"Pela IA" leva a lista a 824 e **a aba continua marcando 852**.

**Conferido na tela:** Novas 171 · Em análise 0 · Descartadas 852 ·
Selecionadas 46 · **Total 1069**. 171 + 0 + 852 + 46 = 1069.

Os números mudaram porque **o Sampaio selecionou as 46 aprovadas enquanto eu
trabalhava** — ou seja, o "Selecionar todas" da rodada anterior funcionou em uso
real. Isso expôs um caso que eu não tinha previsto: com Atendem em 0, abrir o
recorte "Atendem" por padrão daria uma tela vazia escondendo 171 pendentes.
Resolvido com um ajuste de padrão aplicado uma única vez na primeira carga.

**Estado:** lint 0 erros, build ✓. Nada commitado, nada publicado.
