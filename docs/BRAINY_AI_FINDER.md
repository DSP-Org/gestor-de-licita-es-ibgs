# 🧠 Brainy AI Finder — Hub de Inteligência & Seleção de Modelos

**Ferramenta desenvolvida por:** Sampaio  
**URL de Acesso:** [https://brainy-ai-finder.lovable.app/finder](https://brainy-ai-finder.lovable.app/finder)  
**Rotas Principais:**
- `/finder`: Localizador e recomendador inteligente de modelos baseado em caso de uso.
- `/compare`: Comparador lado a lado de até 4 modelos simultâneos.
- `/model/:id`: Ficha técnica detalhada com métricas de contexto, preço e benchmark.

---

## 🎯 Finalidade no Ecossistema Data5
O **Brainy AI Finder** funciona como o nosso "oráculo de modelos" e consultor de benchmarking quando precisarmos decidir qual LLM escalar para tarefas específicas, avaliando:

1. **Suitability Scores (Scores de Adequação)**:
   - Coding & Refatoração
   - Raciocínio & Arquitetura Complexa
   - Tarefas Agenticas & Multi-agente
   - Custo-benefício & Velocidade
2. **Pricing & Custo Efetivo por 1M de Tokens**:
   - Custo de Entrada (Input)
   - Custo de Saída (Output)
   - Blended Average (Custo Médio Ponderado)
   - Projeção de custo por lote (10k palavras, 100k palavras, 1M palavras)
3. **Especificações Técnicas**:
   - Tamanho da Janela de Contexto (Context Window)
   - Licença (Open Source vs Proprietário)
   - Pontos fortes (Strengths) identificados

---

## 🔌 Integração via OpenRouter API
A ferramenta conta com suporte à API do **OpenRouter** (`https://openrouter.ai/api/v1/models`).

### Possibilidades de Automação:
- Consultar dinamicamente a lista de modelos ativos, preços atualizados e limites de contexto.
- Criar um script de roteamento dinâmico (`scripts/model-router.js`) onde o Antigravity pode chamar automaticamente o melhor modelo para uma microtarefa.

> 🔑 **Chave de API**: Quando fornecida pelo Sampaio, pode ser configurada no `.env.local` como `OPENROUTER_API_KEY` para consultas automatizadas e benchmarks em tempo real.
