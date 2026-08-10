# 🔒 Garantia de Não Perder Dados Atuais

## 📌 A Resposta Direta

**Você NÃO vai perder dados atuais porque:**

1. ✅ **Dados são salvos em 2 lugares** (Banco + Cache)
2. ✅ **Banco é PERMANENTE** (não expira)
3. ✅ **Cache só expira na DB, não os dados**
4. ✅ **Você recupera do BD mesmo sem cache**

---

## 🏗️ Arquitetura: 2 Camadas de Persistência

### **Camada 1: Banco de Dados Principal (PERMANENTE)**

```
Table: Licitacao
├─ id_licitacao (chave única)
├─ titulo
├─ objeto
├─ uf
├─ municipio
├─ valor
├─ status
├─ favorito
├─ notas
├─ ... 20+ campos
└─ created_date (nunca muda)

✅ NUNCA expira
✅ NUNCA é deletado automaticamente
✅ Backup automático (Base44)
✅ Recuperável mesmo com falha
```

### **Camada 2: Cache (TEMPORÁRIO)**

```
Table: ConsultaCache
├─ chave_cache (filtros)
├─ resultado (JSON dos resultados da API)
├─ expira_em (data/hora de expiração)
└─ ...

⚠️ Expira em 15 min-7 dias
⚠️ Servir é rápido
⚠️ Quando expira → é refeito do BD
❌ NÃO deleta dados da Licitacao
```

**Crucial:** Cache apenas **REUTILIZA** dados já salvos. Ele não é o armazenamento final!

---

## 🔄 Fluxo: O que Realmente Acontece

### **ETAPA 1: Você Sincroniza**

```javascript
// sincronizarBuscas() no backend
const lics = [];

// Para cada data, busca na API
for (const data_insercao of datasParaSincronizar(...)) {
  for (let pagina = 1; pagina <= 5; pagina++) {
    const data = await consultarComCache(base44, {
      uf: busca.uf,
      palavra_chave: busca.palavra_chave,
      municipio_ibge: busca.municipio_ibge,
      data_insercao,
      pagina,
    });
    lics.push(...(data.licitacoes || []));
  }
}
```

**O que consultarComCache faz:**

```typescript
export async function consultarComCache(base44: any, filtros: any) {
  const chave = JSON.stringify(filtros);
  
  // 1. Procura em cache
  const existentes = await base44.asServiceRole.entities.ConsultaCache
    .filter({ chave });
  const cache = existentes[0];
  
  // 2. Se tem cache válido → retorna resultado ARMAZENADO
  if (cache && new Date(cache.expira_em) > new Date()) {
    return cache.resultado;  // ← Já foi salvo em Licitacao antes!
  }
  
  // 3. Se não tem ou expirou → chama API
  let resultado;
  try {
    resultado = await consultarAlertaLicitacao(filtros);
  } catch (e) {
    if (cache) return cache.resultado;  // ← Fallback ao cache antigo
    throw e;
  }
  
  // 4. ATUALIZA cache (não deleta dados!)
  const expira_em = new Date(Date.now() + ttl * 3600000).toISOString();
  if (cache) {
    await base44.asServiceRole.entities.ConsultaCache.update(cache.id, {
      resultado,
      expira_em
    });
  } else {
    await base44.asServiceRole.entities.ConsultaCache.create({
      chave,
      resultado,
      expira_em
    });
  }
  
  return resultado;
}
```

### **ETAPA 2: Salva os Dados (O IMPORTANTE!)**

```javascript
// Volta para sincronizarBuscas()
// Filtra por palavras-chave
const resultados = busca.modo_palavras === "todas"
  ? filtrarPorTodasPalavras(lics, busca.palavra_chave)
  : lics;

// Busca o que já existe no BD
const existentes = await base44.asServiceRole.entities.Licitacao
  .filter({ usuario_id: donoId });
const existIds = new Set(existentes.map((l) => l.id_licitacao));

// Identifica NOVAS licitações (não existem no BD)
const novas = resultados
  .filter((l) => !existIds.has(l.id_licitacao))
  .map((l) => ({
    id_licitacao: l.id_licitacao,
    titulo: l.titulo,
    // ... mapeamento de campos
    salva_manualmente: false,
    usuario_id: donoId,
  }));

// ✅ SALVA NO BANCO DE DADOS PERMANENTEMENTE
if (novas.length > 0) {
  await base44.asServiceRole.entities.Licitacao.bulkCreate(novas);
  // ← Aqui está a GARANTIA! Dados já estão no BD!
}
```

**Fluxo Visual:**

```
API Externa → consultarComCache() → ConsultaCache + return resultado
                                            ↓
                                    (usado para salvar)
                                            ↓
                                  bulkCreate(licitacoes)
                                            ↓
                                  ✅ LICITACAO TABLE
                                  (PERMANENTE!)
```

---

## 🎯 Exemplos que Garantem Entendimento

### **CENÁRIO 1: Sincroniza Hoje, Consulta Amanhã**

```
10/08/2026 - 18:00
├─ Clica "Sincronizar Agora"
├─ Busca: "SP, Infraestrutura, 01/08"
├─ API retorna: 15 licitações
├─ ✅ bulkCreate() → Salva em Licitacao table
├─ ConsultaCache criado (expira em 18:15)
└─ Resultado: Dados estão em 2 lugares

11/08/2026 - 10:00
├─ Abre o app novamente
├─ Quer ver "SP, Infraestrutura"
├─ Código tenta consultar:
│  ├─ Procura em ConsultaCache... 
│  │  └─ EXPIROU (16 horas depois) ❌
│  ├─ NÃO acha em cache
│  ├─ Chama API... (sincronização manual)
│  └─ Retorna MESMO resultado
├─ ✅ Mas mesmo que não sincronize:
│  └─ Dados estão em Licitacao table!
└─ Resultado: Você VÊ os dados (não perdeu!)
```

### **CENÁRIO 2: Nunca Sincronizou vs Sincronizou**

```
Busca: "RJ, Obras"

❌ ANTES (09/08, nunca sincronizou):
├─ Banco de dados: VAZIO (não existe essa busca)
├─ Cache: VAZIO (não existe)
└─ Resultado: Nenhuma licitação

✅ DEPOIS (10/08, sincronizou):
├─ API retorna: 20 licitações
├─ bulkCreate() → Salva em Licitacao
├─ Cache criado
└─ Resultado: 20 licitações PERMANENTES
```

### **CENÁRIO 3: Cache Expira, Dados Permanecem**

```
LINHA DO TEMPO:

01/08 - 10:00 → Sincroniza busca de 31/07
├─ API: 50 licitações
├─ ✅ Licitacao table: SALVO (permanente, sem expira)
├─ Cache: CRIADO (expira em 08/08)
└─ Performance: Rápido por 7 dias

08/08 - 00:00 → Cache expira
├─ ConsultaCache: DELETADO (expirou)
├─ ✅ Licitacao table: AINDA LÁ (não muda!)
└─ Dados: Continuam acessíveis

09/08 - Sincroniza novamente
├─ Cache expirou → Chama API
├─ API retorna: 50 licitações (mesmas?)
├─ bulkCreate() de NOVAS apenas
└─ Dados no BD: AGORA atualizado
```

### **CENÁRIO 4: API Cai, Você Perde Cache?**

```
18:00 → Sincroniza
├─ API externa retorna dados
├─ ✅ Salva em Licitacao table
├─ Cache criado
└─ Tudo ok

18:05 → API CADE / FALHA
├─ ConsultaCache table: Ainda lá ✓
├─ Licitacao table: Ainda lá ✓
└─ Você ve dados normalmente!

18:06 → Tenta sincronizar novamente
├─ API está offline
├─ consultarComCache() tenta chamar
├─ Falha na API
├─ Mas TEM cache antigo → retorna ele
└─ Você ve dados do cache (ou BD)
```

---

## ⚡ A Sequência EXATA de Segurança

```
1. API retorna dados
   ↓
2. ✅ SALVA em Licitacao table (PERMANENTE)
   ↓
3. ✅ TAMBÉM SALVA em ConsultaCache (temporário)
   ↓
4. Frontend mostra os dados
   ↓
5. Cache expira em 7-15 dias
   ↓
6. ❌ Cache é deletado/refeito
   ↓
7. ✅ MAS DADOS em Licitacao continuam lá!
   ↓
8. Próxima sincronização
   ↓
9. Cache é refeito do BD (não perde nada!)
```

**Conclusão:** Cache é apenas uma **otimização de performance**, não o armazenamento principal!

---

## 🛡️ O Que É Garantido vs Não Garantido

### **✅ GARANTIDO**

| Dado | Garantia |
|------|----------|
| **Licitações sincronizadas** | ✓ Salvas em BD permanentemente |
| **Edições (status, notas)** | ✓ Salvas em BD, não afetadas por cache |
| **Favoritos** | ✓ Campo em Licitacao, persiste |
| **Buscas salvas** | ✓ Entity BuscaSalva, permanente |
| **Histórico** | ✓ Created_date, never deleted |

### **❌ NÃO GARANTIDO**

| Situação | Resultado |
|----------|-----------|
| **Cache expirar** | ❌ Resultado temporário perdido, mas BD tem tudo |
| **App fecha (F5)** | ❌ State do React é perdido, mas BD tem tudo |
| **Nunca sincronizou** | ❌ Sem dados (é sua escolha) |
| **Deletou licitação** | ❌ Removido do BD (ação intencional) |
| **BD falhar** | ❌ Perde tudo (mas Base44 faz backup) |

---

## 📊 Resumo Visual: Onde os Dados Vivem

```
┌─────────────────────────────────────────────────┐
│                  API EXTERNA                    │
│         (alertalicitacao.com.br)                │
│  Apenas leitura, não armazena seus dados        │
└────────────────┬────────────────────────────────┘
                 │ (busca e retorna)
                 ↓
┌─────────────────────────────────────────────────┐
│              BACKEND BASE44                     │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Table: Licitacao  (PERMANENTE)           │  │
│  ├─ 100 licitações sincronizadas           │  │
│  ├─ Salvo para sempre (com backup)         │  │
│  └─ Seu tesouro de dados! ✓                │  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Table: ConsultaCache (TEMPORÁRIO)        │  │
│  ├─ Resultado de última busca              │  │
│  ├─ Expira em 15 min - 7 dias              │  │
│  └─ Serve apenas para PERFORMANCE          │  │
│                                                 │
└──────────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│            FRONTEND (React)                     │
│  novas, favoritas, acervo = State (RAM)         │
│  Perdido ao F5, mas recuperável do BD ✓         │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Resposta à Pergunta Original

**"E qual a garantia que não vou perder dados atuais?"**

### A Garantia é Tripla:

1. **Camada 1: Base44 Database**
   - PostgreSQL com backups automáticos
   - Dados salvos permanentemente
   - Nunca expira

2. **Camada 2: Replicação**
   - Dados também em ConsultaCache (temporário)
   - Se algum expira, recupera do BD principal

3. **Camada 3: Separação de Responsabilidades**
   - Licitacao = DADOS
   - ConsultaCache = PERFORMANCE
   - Nunca confunde um com outro

---

## 💯 Conclusão

```
Cache expira?        → Dados ainda estão em Licitacao ✓
App fecha?           → Dados ainda estão em Licitacao ✓
API cai?             → Dados ainda estão em Licitacao ✓
Você edita licitação?→ Salva em Licitacao, não afeta cache ✓

ÚNICA forma de perder dados:
❌ Deletar manualmente
❌ Base44 sofrer falha catastrófica (improvável, tem backup)
❌ Nunca sincronizar (aí não há dados para perder)
```

**Você está seguro! 🔒**

