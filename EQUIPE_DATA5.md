# Equipe Data5 — Painel de Missão Ativa (Janela Operacional)

> 📌 **Histórico Arquivado:** As sprints anteriores (1 a 3) estão salvas na memória do CEO.  
> ⚠️ **Regra de Ouro:** Foco estrito no arquivo sob seu LOCK. Respeite os limites para evitar corridas ou regressões.

---

## 🎯 Estado Atual da Equipe (Sprint 4: Automação Proativa de Prazos & Exportação)

| Agente | Modelo | Ambiente | Papel Principal | Status Atual | Arquivo sob LOCK |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Antigravity** | Gemini 3.8 | Desktop | Arquiteto Chefe & QA | Ativo / Orquestrando | Governança & QA |
| **Claude Code** | Sonnet 5 | Desktop | Backend & Regras de Negócio | 🚀 EM EXECUÇÃO | `base44/functions/sincronizarBuscas/entry.ts` |
| **Freebuff** | Mimo 2.5 | Terminal | Utilitários & Exportadores | 🚀 EM EXECUÇÃO | `src/lib/exportarLicitacoesExcel.js` |
| **AGY** | Gemini 3.7 | Terminal | UI / Componentes & Telas | 🚀 EM EXECUÇÃO | `src/components/licitacoes/AcervoFiltros.jsx` |

---

## ⚡ ORDENS DE MISSÃO OFICIAIS — SPRINT 4 (PÉ NA TÁBUA!)

### 🟣 TAREFA 1: Claude Code (Desktop - Sonnet 5)
- **LOCK Exclusivo**: `base44/functions/sincronizarBuscas/entry.ts`
- **Objetivo**: Implementar a rotina de **Alerta de Prazo Crítico (≤ 24h)** para licitações favoritadas.
- **Instruções**:
  1. No final do fluxo de sincronização de cada busca (ou ao final de todas as buscas em `entry.ts`), faça uma consulta rápida às licitações favoritadas daquela unidade de negócio (`favorito: true`, `status: { $in: ["interessado", "em_analise", "participando"] }`).
  2. Identifique quais abrem hoje ou amanhã (disputa em ≤ 24h a 48h ancoradas em SP: `hojeSP()`).
  3. Se houver licitações críticas iminentes, prepare um bloco de alerta prioritário e envie aos e-mails configurados da busca ou do usuário: *"⚠️ ALERTA DE PREGÃO IMINENTE (≤ 24h) — [X] licitações abrem hoje/amanhã"*.
  4. Garanta bloco `try/catch` resiliente para que falhas de envio de alerta de prazo nunca abortem a sincronização de novas licitações.
  5. Avise aqui e faça commit ao concluir.

---

### 🟡 TAREFA 2: Freebuff (Terminal - Mimo 2.5)
- **LOCK Exclusivo**: `src/lib/exportarLicitacoesExcel.js`
- **Objetivo**: Elevar o exportador Excel/CSV ao mesmo patamar executivo que você construiu no PDF.
- **Instruções**:
  1. Em `src/lib/exportarLicitacoesExcel.js`, importe `calcularUrgenciaAbertura` de `@/lib/prazosLicitacao.js`.
  2. Adicione as colunas: `"Status"` e `"Urgência"` ao CSV (ex: `"Hoje às 10:00"`, `"Em 2 dias"`, `"Encerrada"`).
  3. Adicione no início do CSV (ou nas 3 primeiras linhas como cabeçalho executivo resumido):
     - `Resumo Executivo;Total de Licitações: [N];Valor Total: [R$];Valor em Disputa: [R$]`
  4. Rode `npm run build` para garantir zero erro de build e avise aqui com UNLOCK.

---

### 🟢 TAREFA 3: AGY (Terminal - Gemini 3.7)
- **LOCK Exclusivo**: `src/components/licitacoes/AcervoFiltros.jsx`
- **Objetivo**: Equipar o filtro do Acervo com seletor de urgência para decisões rápidas do operador.
- **Instruções**:
  1. Em `src/components/licitacoes/AcervoFiltros.jsx`, adicione um seletor ou pílulas de filtro rápido de urgência ao lado do dropdown de busca salva:
     - Opções: `Todos os Prazos`, `Disputa Hoje (Crítico)`, `Em até 3 dias`, `Em até 7 dias`.
  2. Aceite a prop opcional `filtroUrgencia` e `onChangeUrgencia` com valores padrão sem quebrar chamadas existentes.
  3. Rode `npm run build` para garantir 100% de sucesso na compilação e avise aqui com UNLOCK.

---

Tropa em ação coordenada! Sem sobreposição de arquivos.
