# Comportamento de Atualização - Aba "Novas"

## 📋 Visão Geral

A aba **"Novas"** mostra licitações que foram encontradas automaticamente pela **sincronização de Buscas Salvas**. Estas licitações são **temporárias** - não são salvas manualmente pelo usuário.

---

## 🔄 Ciclo de Vida da Aba "Novas"

### 1️⃣ **CARREGAMENTO INICIAL**

**Quando:** Na primeira abertura da página (useEffect com dependência vazia)

**O que acontece:**

```javascript
useEffect(() => {
  carregarNovas();  // Função 1
  // ... mais code
}, []);  // Executa uma vez ao montar
```

**Função: `carregarNovas()`**

```javascript
const carregarNovas = async () => {
  setNovasLoading(true);  // Mostra spinner
  try {
    // Busca TODAS as licitações do backend
    const lista = await base44.entities.Licitacao.list("-created_date", 500);
    
    // Filtra apenas as que são "automáticas" (não salvas manualmente)
    setNovas(toArray(lista).filter((item) => 
      item.salva_manualmente !== true &&  // NÃO foram salvas manualmente
      item.busca_origem                   // TEM busca de origem
    ));
  } finally {
    setNovasLoading(false);  // Tira spinner
  }
};
```

**Estado após:**
- ✅ `novas` = array com licitações automáticas ordenadas por data
- ✅ `novasLoading` = false
- ✅ A UI mostra as "Novas"

---

### 2️⃣ **SINCRONIZAÇÃO MANUAL** 

**Quando:** Usuário clica no botão "Sincronizar Agora"

**O que acontece:**

```javascript
const sincronizarAgora = async () => {
  setSincronizando(true);         // Desabilita botão
  setResultadoSync(null);         // Limpa resultado anterior
  try {
    // Invoca função backend que executa todas as buscas salvas
    const res = await base44.functions.invoke("sincronizarBuscas", { 
      buscaIds: buscasSelecionadas 
    });
    
    setResultadoSync(res.data || res);  // Mostra feedback (sucesso/erros)
    carregarNovas();  // ⚡ RECARREGA A ABA!
  } catch (e) {
    setResultadoSync({ error: e.message });
  } finally {
    setSincronizando(false);
  }
};
```

**Backend (função `sincronizarBuscas`):**
- Percorre cada BuscaSalva selecionada
- Chama API externa (Alerta Licitação) com filtros
- Cria/atualiza registros de Licitacao na DB
- Envia emails de notificação (se ativado)

**Estado após:**
- ✅ Novas licitações aparecem em "Novas"
- ✅ `resultadoSync` mostra quantas foram adicionadas
- ✅ `novasLoading` = false

---

### 3️⃣ **EDIÇÃO DE LICITAÇÃO**

**Quando:** Usuário clica na licitação → edita → clica Salvar

**Fluxo:**

```javascript
// 1. Clica na licitação
onClick={() => setSelecionada(l)}
  ↓
// 2. Abre modal LicitacaoDetailDialog
{selecionada && <LicitacaoDetailDialog ... />}
  ↓
// 3. Usuário edita e clica Salvar
onSave={handleSaveNova}
  ↓
// 4. Função de salvamento
const handleSaveNova = async (dados) => {
  const { id, created_date, updated_date, created_by_id, ...rest } = dados;
  
  // Atualiza no backend
  await base44.entities.Licitacao.update(selecionada.id, rest);
  
  setSelecionada(null);    // Fecha modal
  carregarNovas();         // ⚡ RECARREGA A ABA!
};
```

**Estado após:**
- ✅ Mudanças persistidas no backend
- ✅ Modal fecha
- ✅ Lista "Novas" recarregada (reflete mudanças)

---

### 4️⃣ **AÇÕES NOS CARDS**

#### **A) Salvar Manualmente**

```javascript
const handleSaveManual = async (licitacao) => {
  // Marca como "salva manualmente" e "favorito"
  await base44.entities.Licitacao.update(licitacao.id, { 
    salva_manualmente: true,
    favorito: true 
  });
  
  // Remove da lista "Novas" (não vai recarregar do backend)
  setNovas((prev) => prev.filter((item) => item.id !== licitacao.id));
};
```

**O que significa:**
- A licitação **sai da aba "Novas"** imediatamente
- Aparece em **"Favoritos"** (em lista ou sem lista)
- NÃO aparece mais em sincronizações futuras

**Estado após:**
- ✅ `novas` array sem a licitação
- ✅ Backend atualizado
- ✅ UI reflete mudança imediatamente

---

#### **B) Deletar**

```javascript
const handleDeleteNova = async (licitacao) => {
  if (!window.confirm(...)) return;
  
  // Deleta do backend
  await base44.entities.Licitacao.delete(licitacao.id);
  
  // Remove da lista local
  setNovas((prev) => prev.filter((l) => l.id !== licitacao.id));
  
  // Remove também das seleções
  setSelecionadasNovas((prev) => {
    const nova = new Set(prev);
    nova.delete(licitacao.id_licitacao);
    return nova;
  });
};
```

**O que significa:**
- A licitação é **permanentemente deletada**
- Sai da aba "Novas" imediatamente
- Não pode ser recuperada

**Estado após:**
- ✅ `novas` array sem a licitação
- ✅ Backend deletado
- ✅ Seleções atualizadas

---

#### **C) Compartilhar**

```javascript
const renderActionsNova = (licitacao) => (
  <AtualizacaoActions
    onSend={() => setCompartilhar([licitacao])}
    ...
  />
);
```

**O que significa:**
- Abre modal ShareDialog
- **NÃO altera** a aba "Novas"
- A licitação continua em "Novas"

**Estado após:**
- ✅ Modal de compartilhamento aparece
- ✅ `novas` permanece igual

---

### 5️⃣ **AÇÕES EM MASSA**

```javascript
// Salvar múltiplas
const salvarSelecionadasNovas = async () => {
  const itens = itensSelecionadosNovas();
  
  // Atualiza todas de uma vez
  await base44.entities.Licitacao.bulkUpdate(
    itens.map((item) => ({ 
      id: item.id, 
      salva_manualmente: true, 
      favorito: true 
    }))
  );
  
  // Remove todas da lista "Novas"
  setNovas((prev) => prev.filter((item) => 
    !selecionadasNovas.has(item.id_licitacao)
  ));
  
  setSelecionadasNovas(new Set());  // Limpa seleção
};

// Deletar múltiplas
const excluirSelecionadasNovas = async () => {
  if (!window.confirm(...)) return;
  
  const ids = itensSelecionadosNovas().map((item) => item.id);
  
  // Deleta em batch
  await base44.entities.Licitacao.deleteMany({ 
    id: { $in: ids } 
  });
  
  setNovas((prev) => prev.filter((item) => 
    !selecionadasNovas.has(item.id_licitacao)
  ));
  
  setSelecionadasNovas(new Set());
};
```

**O que significa:**
- Mesmo comportamento das ações individuais
- Mas trata múltiplas licitações por vez
- Mais eficiente

---

## 🎯 Padrões de Atualização

### **Quem Recarrega do Backend?**

✅ **RECARREGA** (`carregarNovas()`):
- Sincronização manual
- Edição de licitação
- Alteração de filtros (quando necessário)

❌ **NÃO RECARREGA** (apenas state local):
- Salvar manual (apenas `setNovas()` local)
- Deletar (apenas `setNovas()` local)
- Selecionar/deselecionar
- Compartilhar

### **Por que isso?**

| Ação | Recarrega? | Por quê? |
|------|-----------|---------|
| Sincronização | ✅ Sim | Backend adiciona novas licitações, precisa refletir |
| Edição | ✅ Sim | Mudanças podem afetar filtros, sorting, etc |
| Salvar manual | ❌ Não | Só remove da lista local, muito rápido com otimismo |
| Deletar | ❌ Não | Só remove da lista local, muito rápido com otimismo |
| Compartilhar | ❌ Não | Não altera a lista, apenas cria um link |

---

## 📊 Estado Completo da Aba "Novas"

```javascript
// Array de licitações "automáticas"
const [novas, setNovas] = useState([]);

// Carregando dados?
const [novasLoading, setNovasLoading] = useState(true);

// Status da sincronização
const [sincronizando, setSincronizando] = useState(false);
const [resultadoSync, setResultadoSync] = useState(null);

// Filtros
const [filtroStatus, setFiltroStatus] = useState("todos");
const [filtroOrigem, setFiltroOrigem] = useState(null);
const [busca, setBusca] = useState("");

// Seleções múltiplas
const [selecionadasNovas, setSelecionadasNovas] = useState(new Set());

// Buscas salvas
const [buscasSalvas, setBuscasSalvas] = useState([]);
const [buscasSelecionadas, setBuscasSelecionadas] = useState([]);

// Compartilhamento
const [compartilhar, setCompartilhar] = useState(null);
```

---

## 🔍 Exemplo: Fluxo Completo

### Cenário: Usuário sincroniza e edita uma licitação

```
1. Página carrega
   ↓
2. carregarNovas() executa
   → Busca todas as licitações com busca_origem
   → Estado: novas = [5 licitações]
   
3. Usuário clica "Sincronizar Agora"
   ↓
4. sincronizarAgora() executa
   → Chama backend sincronizarBuscas()
   → Backend encontra 3 novas licitações
   → carregarNovas() recarrega
   → Estado: novas = [8 licitações] (5 + 3 novas)
   
5. Usuário clica em uma licitação
   ↓
6. LicitacaoDetailDialog abre
   → Mostra dados da licitação
   
7. Usuário edita e clica Salvar
   ↓
8. handleSaveNova() executa
   → Atualiza backend
   → carregarNovas() recarrega
   → Estado: novas = [8 licitações] (mesmas, mas dados atualizados)
   
9. Modal fecha
   → UI reflete mudanças
```

---

## ⚠️ Armadilhas Comuns

### ❌ **Problema 1: Esperava que mudança aparecesse imediatamente**
**Solução:** Edições causam `carregarNovas()`, mas as mudanças podem levar alguns ms para aparecer.

### ❌ **Problema 2: Deletou mas ainda aparece**
**Verificar:**
- Está em "Novas" ou em outro lugar (Favoritos, Acervo)?
- Backend realmente deletou?
- Cache do navegador precisa limpar?

### ❌ **Problema 3: Sincronizou mas não viu mudanças**
**Verificar:**
- Filtro está filtrando as novas?
- As buscas foram realmente sincronizadas?
- Há licitações novas nesse período?

---

## 🎯 Resumo das Regras

1. **Novas = Automáticas**: Vêm apenas de sincronizações
2. **Recarrega quando**: Sincroniza ou edita
3. **Remove quando**: Salva manual ou deleta
4. **Mostra quando**: Passa pelo filtro
5. **Persiste**: Tudo no backend, estado local é cache

