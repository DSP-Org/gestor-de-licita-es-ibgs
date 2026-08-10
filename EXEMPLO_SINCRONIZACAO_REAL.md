# 📅 Exemplo Real: 10/08 - Primeira Sincronização

## 🎯 Cenário Específico

**Data:** 10 de Agosto de 2026, 14:00:00  
**Histórico:** Nunca sincronizou nada antes  
**Busca criada:** "SP - Infraestrutura"

---

## 📊 Estado Inicial (14:00:00)

### Seu Banco de Dados
```
Licitacao table (seu usuário):
├─ Total: 0 licitações
├─ IDs salvos: []
└─ Historia: VAZIA

ConsultaCache table:
└─ Total: 0 registros

BuscaSalva criada:
{
  id: "busca-sp-infra-001",
  nome: "SP - Infraestrutura",
  ativa: true,
  uf: "SP",
  palavra_chave: "infraestrutura",
  modalidade: null (qualquer uma),
  municipio_ibge: null (qualquer um),
  notificacoes: true,
  ultima_sincronizacao: null,  ← IMPORTANTE!
  created_date: "2026-08-10T10:00:00Z"
}
```

---

## ⏱️ Linha do Tempo: Segundo a Segundo

### **14:00:00.000 - Você Clica "Sincronizar Agora"**

```javascript
// Frontend (BancoLicitacoes.jsx)
const sincronizarAgora = async () => {
  setSincronizando(true);  // Mostra spinner
  setResultadoSync(null);

  try {
    // ENVIA PARA O SERVIDOR
    const res = await base44.functions.invoke("sincronizarBuscas", {
      buscaIds: ["busca-sp-infra-001"]
    });
    
    setResultadoSync(res.data || res);
    carregarNovas();  // Recarrega a aba "Novas"
  } catch (e) {
    setResultadoSync({ error: e.message });
  } finally {
    setSincronizando(false);  // Tira spinner
  }
};
```

**UI:** Spinner começa girar 🔄

---

### **14:00:01.200 - Backend Recebe o Request**

```typescript
// Backend (sincronizarBuscas/entry.ts)
export default async function(req) {
  try {
    // 1. Identifica o usuário
    const user = await base44.auth.me();
    // Resultado: { id: "user-xyz", email: "seu@email.com", role: "user" }

    // 2. Parse do payload
    const payload = await req.json();
    // Resultado: { buscaIds: ["busca-sp-infra-001"] }

    // 3. Busca TODAS as buscas ativas do usuário
    const todasAtivas = await base44.asServiceRole.entities.BuscaSalva
      .filter({ ativa: true });
    // Resultado: [
    //   { id: "busca-sp-infra-001", nome: "SP - Infraestrutura", ... }
    // ]

    // 4. Filtra apenas as selecionadas
    const idsSelecionados = payload.buscaIds;
    // "busca-sp-infra-001" está em idsSelecionados? SIM
    
    const buscas = todasAtivas
      .filter((busca) => idsSelecionados.includes(busca.id));
    // Resultado: [{ id: "busca-sp-infra-001", ... }]

    let buscasProcessadas = 0;
    let totalNovas = 0;
    const resumo = [];
```

---

### **14:00:01.300 - Calcula Datas a Sincronizar**

```typescript
// Para a busca "SP - Infraestrutura"
for (const busca of buscas) {
  // busca.ultima_sincronizacao = null (PRIMEIRA VEZ!)

  // CRUCIAL: Função datasParaSincronizar
  for (const data_insercao of datasParaSincronizar(null)) {
    // datasParaSincronizar(null) retorna últimos 31 dias!
    // Porque: Sem histórico = sincroniza "todo" período disponível
  }
}

function datasParaSincronizar(ultima_sincronizacao) {
  if (!ultima_sincronizacao) {
    // PRIMEIRA SINCRONIZAÇÃO
    // Retorna últimos 31 dias (limite da API)
    const hoje = new Date();
    const 31DiasAtras = new Date(hoje.getTime() - 31*24*60*60*1000);
    
    // Itera cada dia: 31 datas
    return [
      "2026-07-10",  // Dia 1
      "2026-07-11",  // Dia 2
      "2026-07-12",  // Dia 3
      // ...
      "2026-08-08",  // Dia 30
      "2026-08-09",  // Dia 31
      "2026-08-10"   // Hoje
    ];
  }
}

// RESULTADO: 31 datas para processar
```

**Decisão importante:** Como é primeira sincronização, vai buscar **31 DIAS COMPLETOS!**

---

### **14:00:02.000 - Começa Loop de Chamadas à API**

```typescript
const lics = [];

for (const data_insercao of datasParaSincronizar(null)) {
  // Vai iterar 31 vezes (uma por dia)
  
  for (let pagina = 1; pagina <= 5; pagina++) {
    // Vai iterar 5 vezes (5 páginas de resultados)
    
    // CHAMADA À API
    const data = await consultarComCache(base44, {
      uf: "SP",
      palavra_chave: "infraestrutura",
      modalidade: null,
      municipio_ibge: null,
      data_insercao,  // Cada dia
      pagina,         // Cada página
      licitacoesPorPagina: 100
    });
    
    lics.push(...(data.licitacoes || []));
    
    if (pagina >= (Number(data.paginas) || 1)) break;
  }
}

// TOTAL: Até 31 × 5 = 155 chamadas à API!
// MAS: Muitos dias podem estar vazios (não coleta 155)
// Realista: ~50-100 chamadas dependendo de quanto dados a API retorna
```

**O que consultarComCache faz para CADA chamada:**

```typescript
export async function consultarComCache(base44, filtros) {
  // 1. Cria chave única
  const chave = JSON.stringify({
    uf: "SP",
    palavra_chave: "infraestrutura",
    data_insercao: "2026-08-10",
    pagina: 1
  });
  // Resultado: '{"uf":"SP","palavra_chave":"infraestrutura",...}'

  // 2. Procura em cache
  const existentes = await base44.asServiceRole.entities.ConsultaCache
    .filter({ chave });
  const cache = existentes[0];
  // Resultado: undefined (primeira sincronização, cache vazio)

  // 3. SE não tem cache OU cache expirou
  if (!cache || new Date(cache.expira_em) <= new Date()) {
    // CHAMA API AQUI! ← LENTO (1-3s)
    let resultado;
    try {
      resultado = await consultarAlertaLicitacao({
        uf: "SP",
        palavra_chave: "infraestrutura",
        data_insercao: "2026-08-10",
        pagina: 1
      });
      // API retorna...
    } catch (e) {
      if (cache) return cache.resultado; // Fallback ao cache antigo
      throw e;
    }

    // 4. SALVA em cache para próxima vez
    const expira_em = new Date(Date.now() + 15*60*1000).toISOString();
    // (15 min para hoje)
    
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

    return resultado; // ← Retorna para sincronizarBuscas
  }

  // SE tem cache E é válido
  return cache.resultado;  // ← Instantâneo!
}
```

---

### **14:00:03.000 até 14:00:35.000 - API Retorna Dados**

**Exemplo: Dia 10/08, Página 1**

```json
{
  "licitacoes": [
    {
      "id_licitacao": "2026-SP-0001234-001",
      "titulo": "Construção de Ponte Rodoviária",
      "objeto": "Construção de infraestrutura viária",
      "uf": "SP",
      "municipio": "São Paulo",
      "municipio_IBGE": "3550308",
      "orgao": "Prefeitura de São Paulo",
      "abertura_datetime": "2026-08-10T15:00:00Z",
      "abertura": "10/08/2026",
      "tipo": "Pregão Eletrônico",
      "id_tipo": "PE",
      "valor": "1500000.00",
      "link": "https://alertalicitacao.com.br/lic/2026-SP-0001234-001",
      "linkExterno": "https://portal.tce.sp.gov.br/..."
    },
    {
      "id_licitacao": "2026-SP-0001235-001",
      "titulo": "Reforma de Escola",
      "objeto": "Reforma de infraestrutura escolar",
      // ... mais campos
    },
    {
      "id_licitacao": "2026-SP-0001236-001",
      "titulo": "Asfaltamento de Avenida",
      // ... mais campos
    }
  ],
  "totalLicitacoes": 28,
  "licitacoesNestaPagina": 3,
  "paginas": 10
}
```

**O que acontece com esses dados:**

```typescript
// Volta para sincronizarBuscas, continua coletando...

// Depois de TODAS as datas/páginas:
// lics = [
//   { id_licitacao: "2026-SP-0001234-001", ... },
//   { id_licitacao: "2026-SP-0001235-001", ... },
//   { id_licitacao: "2026-SP-0001236-001", ... },
//   // ... centenas de licitações
// ]
```

**Tempo total das chamadas:** ~30-40s (muitas podem estar vazias ou rápidas)

---

### **14:00:35.000 - Processa Resultados**

```typescript
// Filtra por palavras-chave (modo_palavras)
const resultados = busca.modo_palavras === "todas"
  ? filtrarPorTodasPalavras(lics, "infraestrutura")
  : lics;
// Resultado: Mantém licitações que contêm "infraestrutura"

// Busca licitações já existentes do usuário
const existentes = await base44.asServiceRole.entities.Licitacao
  .filter({ usuario_id: "user-xyz" });
// Resultado: [] (VAZIO, primeira sincronização)

const existIds = new Set(existentes.map((l) => l.id_licitacao));
// Resultado: Set {} (vazio)

// IDENTIFICA NOVAS
const novas = resultados
  .filter((l) => !existIds.has(l.id_licitacao))  // Todos são novos!
  .map((l) => ({
    id_licitacao: l.id_licitacao,
    titulo: l.titulo,
    objeto: l.objeto,
    uf: l.uf,
    municipio: l.municipio,
    municipio_ibge: l.municipio_IBGE,
    orgao: l.orgao,
    abertura_datetime: l.abertura_datetime,
    abertura: l.abertura,
    tipo: l.tipo,
    id_tipo: l.id_tipo,
    valor: l.valor,
    link: l.link,
    link_externo: l.linkExterno,
    status: "interessado",  // Status padrão
    favorito: false,        // Não é favorito ainda
    busca_origem: "SP - Infraestrutura",
    usuario_id: "user-xyz",
    salva_manualmente: false
  }));

// RESULTADO: Todas as licitações encontradas são "novas"
// Exemplo: 342 licitações novas identificadas
```

---

### **14:00:36.000 - Salva no Banco**

```typescript
if (novas.length > 0) {
  // SALVA TODAS DE UMA VEZ
  await base44.asServiceRole.entities.Licitacao.bulkCreate(novas);
  // Tempo: ~0.5-1s para 342 licitações
  
  totalNovas += novas.length;  // totalNovas = 342
  
  // Notificações (se ativadas)
  if (busca.notificar_email !== false) {
    // Envia email para destinatários
    // Com HTML formatado com as 10 primeiras licitações
  }
  
  // Link de compartilhamento
  const codigo = crypto.randomUUID();
  const linkCompartilhamento = "https://app.com/compartilhar/" + codigo;
  
  await base44.asServiceRole.entities.ResultadoCompartilhado.create({
    codigo,
    licitacoes: novas.map(l => ({ ... }))
  });
}

// Atualiza a busca
await base44.asServiceRole.entities.BuscaSalva.update(busca.id, {
  ultima_sincronizacao: new Date().toISOString(),  // "2026-08-10T14:00:36Z"
  total_encontrado: resultados.length  // 342
});

buscasProcessadas++;  // 1
resumo.push({
  busca: "SP - Infraestrutura",
  novas: 342,
  total: 342
});
```

---

### **14:00:37.000 - Backend Retorna Resposta**

```typescript
return Response.json({
  ok: true,
  buscasProcessadas: 1,
  totalNovas: 342,
  resumo: [
    {
      busca: "SP - Infraestrutura",
      novas: 342,
      total: 342
    }
  ]
});
```

---

### **14:00:38.200 - Frontend Recebe e Atualiza**

```javascript
// sincronizarAgora() continua...
setResultadoSync({
  ok: true,
  buscasProcessadas: 1,
  totalNovas: 342,
  resumo: [...]
});

carregarNovas();  // Recarrega aba "Novas"

setSincronizando(false);  // Tira spinner
```

**UI:** Spinner some, mostra mensagem de sucesso

---

## 📊 Resultado Final (14:00:38)

### Seu Banco de Dados AGORA
```
Licitacao table (seu usuário):
├─ Total: 342 licitações
├─ IDs salvos: [
│   "2026-SP-0001234-001",
│   "2026-SP-0001235-001",
│   "2026-SP-0001236-001",
│   ... mais 339 IDs
│ ]
└─ Status: Todas com status = "interessado"

ConsultaCache table:
├─ Total: ~50-100 registros (uma por data/página chamada)
├─ Cada um com:
│   ├─ chave: "uf=SP|palavra=infraestrutura|data=2026-07-10|page=1"
│   ├─ resultado: {...dados da API...}
│   └─ expira_em: "2026-08-11T02:00:00Z" (ou 7 dias se dia anterior)

BuscaSalva atualizada:
{
  id: "busca-sp-infra-001",
  ultima_sincronizacao: "2026-08-10T14:00:36Z",  ← ATUALIZADO!
  total_encontrado: 342
}

Email/Notificações:
└─ Enviado para seu_email@gmail.com com as 10 primeiras licitações
```

---

## 🎯 O Que Você Vê na Tela

### Durante a Sincronização (14:00:00 - 14:00:38)
```
🔄 Sincronizando...
(spinner girando)
```

### Depois da Sincronização (14:00:38)
```
✅ Sincronização concluída!

Resumo:
├─ Buscas processadas: 1
├─ Novas licitações encontradas: 342
└─ Tempo total: 38 segundos

Aba "Novas":
├─ Mostra 342 licitações encontradas
├─ Filtro pode ser aplicado (status, data, etc)
└─ Cada uma pode ser: favoritada, movida para lista, deletada, etc
```

---

## 💡 Resumo: O Que Realmente Acontece

```
14:00:00  Clica "Sincronizar"
          ↓
14:00:01  Backend recebe
          ↓
14:00:02  Calcula 31 datas (última_sincronizacao = null)
          ↓
14:00:03  Começa loop: 31 datas × ~5 páginas = ~155 chamadas à API
-14:00:35 Cada chamada: 0.5-3s (alguns em cache, maioria na API)
          ↓
14:00:36  Salva 342 licitações novas em Licitacao table
          ↓
14:00:37  Retorna sucesso
          ↓
14:00:38  Frontend recarrega aba "Novas" com 342 licitações
```

**Tempo total:** ~38 segundos  
**Licitações encontradas:** 342  
**Próxima sincronização (11/08 às 14:00):** MUITO mais rápido (múltiplas no cache!)

