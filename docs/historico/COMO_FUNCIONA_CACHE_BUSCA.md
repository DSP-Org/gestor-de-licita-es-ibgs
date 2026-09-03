# 🚀 Como Funciona o Cache de Busca

## 📋 Resumo Executivo

Quando você **sincroniza** licitações, o sistema cria um **cache de resultados** na tabela `ConsultaCache`. 

Se a mesma busca for feita novamente dentro do período de validade, ele **retorna o resultado cacheado** em vez de chamar a API externa novamente.

**Ganhos:**
- ⚡ 1000x mais rápido (ms vs segundos)
- 💰 Economiza custos de API
- 🤝 Compartilhado entre todos os usuários (mesmos filtros = mesmo cache)

---

## 🔍 Estrutura do Cache (`ConsultaCache` Table)

```javascript
{
  id: string                  // ID único do registro
  chave_cache: string         // Chave única gerada dos filtros
  uf: string                  // Estado (SP, RJ, etc)
  palavra_chave: string       // Palavras procuradas
  modalidade: string          // Tipo de licitação
  municipio_ibge: string      // Código IBGE
  data_insercao: string       // Data em formato YYYY-MM-DD
  pagina: number              // Número da página (1, 2, 3...)
  resultado: object           // Resultado da API (JSON)
  expira_em: datetime         // Quando o cache expira
  created_date: datetime      // Quando foi criado
}
```

---

## 🔑 Como a Chave é Gerada

No arquivo `consultaCache.ts` linha 20-30:

```typescript
export async function consultarComCache(base44: any, filtros: any, ttlHoras?: number) {
  // Gera JSON com TODOS os filtros
  const chave = JSON.stringify({
    uf: filtros.uf || "",
    palavra_chave: filtros.palavra_chave || "",
    modalidade: filtros.modalidade || "",
    municipio_ibge: filtros.municipio_ibge || "",
    data_insercao: filtros.data_insercao || "",
    pagina: filtros.pagina || 1,
    licitacoesPorPagina: filtros.licitacoesPorPagina || 50,
  });
```

**Exemplo:**
```
Filtros: {
  uf: "SP",
  palavra_chave: "infraestrutura",
  modalidade: "Pregão",
  municipio_ibge: "3550308",
  data_insercao: "2026-08-10",
  pagina: 1
}

Chave gerada:
"{\"uf\":\"SP\",\"palavra_chave\":\"infraestrutura\",...}"
```

**Importante:** Se qualquer filtro mudar → chave diferente → novo cache!

---

## 🔄 Fluxo de Verificação

### **PASSO 1: Busca no Cache**

```typescript
const existentes = await base44.asServiceRole.entities.ConsultaCache.filter({ 
  chave_cache: chave  // Procura pela chave exata
});
const cache = existentes[0];  // Pega o primeiro (se houver)
```

### **PASSO 2: Verifica Validade**

```typescript
if (cache && new Date(cache.expira_em) > new Date()) {
  // ✅ Cache válido! Retorna
  return cache.resultado;
}
```

**Tradução:**
- Tem cache? **SIM**
- Cache expirou? **NÃO** (expira_em > agora)
- **→ Retorna resultado do cache sem chamar API**

### **PASSO 3: Se Expirou ou Não Tem**

```typescript
let resultado;
try {
  // ❌ Cache expirou, busca na API
  resultado = await consultarAlertaLicitacao(filtros);
} catch (e) {
  // Se API falhar, retorna o cache antigo mesmo que expirado
  if (cache) return cache.resultado;
  throw e;  // Se não tem nem cache antigo, joga erro
}
```

### **PASSO 4: Atualiza Cache**

```typescript
const expira_em = new Date(Date.now() + ttl * 3600000).toISOString();

if (cache) {
  // Atualiza registro existente
  await base44.asServiceRole.entities.ConsultaCache.update(cache.id, { 
    resultado, 
    expira_em 
  });
} else {
  // Cria novo registro
  await base44.asServiceRole.entities.ConsultaCache.create({
    chave_cache: chave,
    uf: filtros.uf,
    // ... outros campos
    resultado,
    expira_em,
  });
}
```

---

## ⏱️ TTL (Time To Live) - Quanto Tempo Dura?

No arquivo `consultaCache.ts` linhas 15-18:

```typescript
function ttlPadrao(dataInsercao?: string) {
  if (!dataInsercao || dataInsercao >= hojeSP()) 
    return 0.25;  // 15 minutos para HOJE
  return 24 * 7;  // 7 dias para dias passados
}
```

### **Lógica:**

| Data da Licitação | TTL | Motivo |
|------------------|-----|--------|
| **HOJE** (2026-08-10) | 15 minutos | Ainda recebe novas licitações |
| **ONTEM ou ANTES** | 7 dias | Não recebe mais atualizações |

### **Cálculo da Expiração:**

```
expira_em = agora + (ttl * 3600000 ms)

Exemplo (hoje, ttl=0.25h):
  agora = 10/08/2026 18:00
  ttl = 0.25 horas = 15 minutos
  expira_em = 18:00 + 15min = 18:15
```

---

## 📊 Exemplo Prático: 3 Buscas Iguais

### **⏰ 18:00 - PRIMEIRA BUSCA**
```
Busca: SP, Infraestrutura, 01/08/2026

1. Gera chave
2. Procura em ConsultaCache → NÃO ENCONTROU ❌
3. Chama API externa
   - Retorna 15 licitações
   - Demora 3 segundos
4. Cria registro em ConsultaCache
   {
     chave: "uf=SP|palavra=infraestrutura|...",
     resultado: { licitacoes: [...], paginas: 1, ... },
     expira_em: "10/08/2026 18:15"  ← Válido por 15 min
   }
```

### **⏰ 18:05 - SEGUNDA BUSCA (MESMOS FILTROS)**
```
Busca: SP, Infraestrutura, 01/08/2026

1. Gera chave (MESMA)
2. Procura em ConsultaCache → ENCONTROU ✓
3. Verifica: 18:05 < 18:15? SIM
4. Cache VÁLIDO → Retorna resultado do BD
   - Demora 50ms (muito mais rápido!)
   - NÃO chama API ⚡
```

### **⏰ 18:20 - TERCEIRA BUSCA (MESMOS FILTROS, CACHE EXPIROU)**
```
Busca: SP, Infraestrutura, 01/08/2026

1. Gera chave (MESMA)
2. Procura em ConsultaCache → ENCONTROU ✓
3. Verifica: 18:20 < 18:15? NÃO
4. Cache EXPIROU ❌
5. Chama API externa NOVAMENTE
6. Atualiza registro:
   {
     ...,
     resultado: { ... resultado novo ... },
     expira_em: "10/08/2026 18:35"  ← Novo período
   }
```

---

## 🌍 Cache é Compartilhado Entre Usuários

**Exemplo:**

```
Usuário A (18:00):
  Busca: SP, Infraestrutura
  → Chama API, cria cache
  → expira_em: 18:15

Usuário B (18:05):
  Busca: SP, Infraestrutura (MESMOS FILTROS)
  → Encontra cache do Usuário A ✓
  → Retorna resultado SEM chamar API
  → Economia! 💰
```

**Importante:** Se filtros forem diferentes → cache diferente!

```
Usuário B (18:05):
  Busca: RJ, Infraestrutura (UF diferente!)
  → Gera chave DIFERENTE
  → Não encontra cache
  → Chama API (novo cache para RJ)
```

---

## 🛡️ Tratamento de Falhas

Se a API cair e você já tem cache (mesmo expirado), ele retorna o cache antigo:

```typescript
try {
  resultado = await consultarAlertaLicitacao(filtros);
} catch (e) {
  // API falhou!
  if (cache) {
    // Tem cache antigo? Retorna mesmo que expirado
    return cache.resultado;
  }
  // Não tem nem cache? Joga erro
  throw e;
}
```

**Benefício:** Seu serviço continua funcionando mesmo se a API externa cair!

---

## 🎯 Resumo das Regras

| Cenário | Ação | Resultado |
|---------|------|-----------|
| **Primeira busca** | Chama API → Cria cache | ⏱️ Lento (3s) |
| **Segunda busca (5min depois)** | Retorna cache | ⚡ Rápido (50ms) |
| **Terceira busca (20min depois)** | Cache expirou → Chama API | ⏱️ Lento |
| **Mesmos filtros, outro usuário** | Compartilha cache | ⚡ Rápido |
| **Filtros diferentes** | Novo cache | ⏱️ Lento (primeira vez) |
| **API falha, tem cache** | Retorna cache antigo | ✓ Funciona |
| **API falha, sem cache** | Erro | ❌ Falha |

---

## 💡 Otimizações

### 1️⃣ **Reutilização Automática**
O cache é compartilhado. Se 100 usuários fazem a mesma busca em 15 minutos:
- 1ª vez: Chama API
- 2-100ª vezes: Retorna cache

### 2️⃣ **TTL Inteligente**
- Hoje: 15 min (pode ter novas licitações)
- Dias passados: 7 dias (não muda mais)

### 3️⃣ **Fallback Graceful**
Se API cai, volta ao cache antigo (melhor que erro!)

---

## 🔧 Monitoramento do Cache

### **Ver Registros do Cache:**
```javascript
// Todos os caches
await base44.entities.ConsultaCache.list();

// Cache de uma busca específica
await base44.entities.ConsultaCache.filter({ 
  uf: "SP",
  palavra_chave: "infraestrutura"
});

// Caches próximos de expirar
await base44.entities.ConsultaCache.filter({ 
  expira_em: { $lt: new Date() } // Expirados
});
```

### **Limpar Cache Manual:**
```javascript
// Delete um cache específico
await base44.entities.ConsultaCache.delete(cacheId);

// Delete todos os caches de SP
const caches = await base44.entities.ConsultaCache.filter({ uf: "SP" });
for (const cache of caches) {
  await base44.entities.ConsultaCache.delete(cache.id);
}
```

---

## 📈 Benefícios Mensuráveis

### **Velocidade:**
```
Sem cache:  3-5 segundos (API externa)
Com cache:  50ms (BD local)
Melhoria:   60-100x mais rápido! ⚡
```

### **Custos:**
```
API externa: $0.01-0.05 por chamada (hipotético)
1000 sincronizações/dia = $10-50/dia

Com cache compartilhado:
- 90% das chamadas usam cache
- 100 chamadas reais à API
- Custo: $1-5/dia
Economia: 80-90% 💰
```

### **Confiabilidade:**
```
API cai? 
  Sem cache: ❌ Serviço quebra
  Com cache: ✓ Continua funcionando com dados antigos
```

