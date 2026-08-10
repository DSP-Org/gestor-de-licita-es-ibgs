# Guia de Integração - Melhorias de Listas de Favoritos

## Visão Rápida

Este documento fornece um guia técnico rápido para entender e modificar as melhorias implementadas.

---

## Estrutura de Arquivos

### Arquivos Principais

```
src/components/licitacoes/
├── FavoritasTab.jsx              (1247 linhas)
│   ├── Importa: @hello-pangea/dnd, exportarLicitacoesPDF, exportarLicitacoesExcel
│   ├── Estados: compartilharLista, exportandoLista
│   ├── Funções: handleDragDropListas, handleExportarLista
│   └── Modais: Compartilhamento, Exportação, Nova/Editar Lista
│
├── LicitacaoDetailDialog.jsx      (298 linhas)
│   ├── Novos estados: listaVinculada, listas, carregandoListas
│   ├── Novo useEffect: carregarListas()
│   └── Campo select: para vincular lista
│
└── ListaStatsCard.jsx             (64 linhas)
    ├── Props: { licitacoes, lista }
    ├── Funções: calcularEstatisticas(), formatarValor()
    └── Componentes: StatItem (interno)
```

---

## Como Modificar Cada Funcionalidade

### 1. Drag & Drop (FavoritasTab.jsx)

**Localização:** Linhas ~200-250

```jsx
// Importar
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Handler
const handleDragDropListas = async (result) => {
  const { source, destination } = result;
  if (!destination || source.index === destination.index) return;
  
  // Reordena array localmente
  const novasListas = Array.from(listas);
  const [movido] = novasListas.splice(source.index, 1);
  novasListas.splice(destination.index, 0, movido);
  
  setListas(novasListas);
  
  // Atualiza backend
  for (let i = 0; i < novasListas.length; i++) {
    await base44.entities.FavoritaLista.update(novasListas[i].id, {
      ordem: i
    });
  }
};

// JSX
<DragDropContext onDragEnd={handleDragDropListas}>
  <Droppable droppableId="listas">
    {(provided, snapshot) => (
      <div {...provided.droppableProps}>
        {listas.map((lista, index) => (
          <Draggable draggableId={lista.id} index={index}>
            {/* Render da lista */}
          </Draggable>
        ))}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

**Para customizar:**
- Alterar `direction` em `Droppable` (vertical/horizontal)
- Mudar `onDragEnd` para adicionar validações
- Adicionar efeitos visuais em `snapshot.isDragging`

---

### 2. Exportação (FavoritasTab.jsx)

**Localização:** Linhas ~180-195 (handler) e ~530-560 (modal)

```jsx
// Handler
const handleExportarLista = (formato) => {
  if (!listaAtual) return;
  
  const licAtual = filtradas;  // Licitações da lista + filtros
  if (licAtual.length === 0) {
    alert("Nenhuma licitação para exportar nesta lista.");
    return;
  }
  
  if (formato === "pdf") {
    exportarLicitacoesPDF(licAtual, `Licitações — ${listaAtual.nome}`);
  } else if (formato === "excel") {
    exportarLicitacoesExcel(
      licAtual, 
      `licitacoes-${listaAtual.nome.toLowerCase().replace(/\s+/g, "-")}`
    );
  }
  setExportandoLista(null);
};

// Modal
{exportandoLista && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-background rounded-xl shadow-lg max-w-sm w-full p-6 space-y-4">
      <h2 className="font-semibold text-lg">Exportar Lista</h2>
      {/* Botões PDF e Excel */}
    </div>
  </div>
)}
```

**Para customizar:**
- Alterar nome do arquivo exportado
- Adicionar mais formatos (PowerPoint, etc)
- Adicionar filtros antes de exportar
- Customizar template PDF (em `exportarLicitacoesPDF.js`)

---

### 3. Compartilhamento (FavoritasTab.jsx)

**Localização:** Linhas ~479-488

```jsx
// Botão na lista
{listaSelecionada === lista.id && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      setCompartilharLista(true);  // Abre modal
    }}
    title="Compartilhar lista"
  >
    <Share2 className="w-3 h-3" />
  </button>
)}

// Modal
{compartilharLista && listaAtual && (
  <ShareDialog
    licitacoes={filtradas}        // Apenas desta lista
    origem={listaAtual.nome}      // Nome personalizado
    onClose={() => setCompartilharLista(false)}
  />
)}
```

**Para customizar:**
- Alterar texto da origem em `ShareDialog`
- Adicionar campos adicionais ao `ResultadoCompartilhado`
- Customizar mensagens de compartilhamento
- Adicionar analytics ao compartilhar

---

### 4. Dashboard de Estatísticas (ListaStatsCard.jsx)

**Localização:** Arquivo completo `ListaStatsCard.jsx`

```jsx
// Função de cálculo
function calcularEstatisticas(licitacoes) {
  const stats = {
    total: licitacoes.length,
    valorTotal: 0,
    ganhas: 0,
    acompanhando: 0,
    participando: 0,
  };
  
  licitacoes.forEach((l) => {
    stats.valorTotal += Number(l.valor) || 0;
    if (l.status === "ganha") stats.ganhas++;
    if (l.status === "acompanhando") stats.acompanhando++;
    if (l.status === "participando") stats.participando++;
  });
  
  return stats;
}

// Componente
export default function ListaStatsCard({ licitacoes, lista }) {
  if (!lista || licitacoes.length === 0) return null;
  
  const stats = calcularEstatisticas(licitacoes);
  const maioresOportunidades = licitacoes
    .sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0))
    .slice(0, 3);
  
  return (
    <div className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Renderizar stats e maiores oportunidades */}
    </div>
  );
}
```

**Para customizar:**
- Adicionar mais métricas (taxa de ganho, etc)
- Mudar número de maiores oportunidades de 3 para N
- Adicionar gráficos (recharts)
- Adicionar filtros de período
- Adicionar comparação com período anterior

---

### 5. Vincularção Direta (LicitacaoDetailDialog.jsx)

**Localização:** Linhas ~12-30 (estados) e ~200-225 (campo)

```jsx
// Novos estados
const [listaVinculada, setListaVinculada] = useState(
  licitacao?.lista_favorita_id || ""
);
const [listas, setListas] = useState([]);
const [carregandoListas, setCarregandoListas] = useState(false);

// Carregar listas ao abrir
useEffect(() => {
  const carregarListas = async () => {
    setCarregandoListas(true);
    try {
      const listasData = await base44.entities.FavoritaLista.list("ordem", 100);
      setListas(toArray(listasData).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)));
    } finally {
      setCarregandoListas(false);
    }
  };
  
  carregarListas();
}, []);

// Campo select
<select
  value={listaVinculada}
  onChange={(e) => setListaVinculada(e.target.value)}
  disabled={carregandoListas}
>
  <option value="">Sem lista (favoritado solto)</option>
  {listas.map((lista) => (
    <option key={lista.id} value={lista.id}>
      {lista.nome}
    </option>
  ))}
</select>

// Ao salvar
const handleSave = () => {
  onSave({
    ...licitacao,
    lista_favorita_id: listaVinculada || null,
    // ... outros campos
  });
};
```

**Para customizar:**
- Adicionar ícone colorido da lista ao lado do dropdown
- Mostrar número de licitações em cada lista
- Adicionar opção de criar lista diretamente no modal
- Adicionar validação antes de salvar

---

## Exemplos de Uso

### Exemplo 1: Adicionar nova métrica ao Dashboard

```jsx
// Em ListaStatsCard.jsx, função calcularEstatisticas()

const stats = {
  total: licitacoes.length,
  valorTotal: 0,
  ganhas: 0,
  acompanhando: 0,
  participando: 0,
  vencidas: 0,  // ← Nova métrica
};

licitacoes.forEach((l) => {
  // ...
  if (l.status === "vencida") stats.vencidas++;  // ← Contar
});

// Em FavoritasTab.jsx, na renderização

<StatItem 
  icon={XIcon} 
  label="Vencidas" 
  value={stats.vencidas} 
  color="text-red-600 bg-red-50" 
/>
```

### Exemplo 2: Adicionar filtro ao exportar

```jsx
// Em FavoritasTab.jsx, função handleExportarLista()

const licAtual = filtradas.filter(l => {
  // Filtro adicional
  if (filtroStatus !== "todos") return l.status === filtroStatus;
  return true;
});
```

### Exemplo 3: Customizar nome do arquivo exportado

```jsx
// Em FavoritasTab.jsx, função handleExportarLista()

const timestamp = new Date().toISOString().split('T')[0];
const nomeArquivo = `favoritos-${listaAtual.nome}-${timestamp}`;

exportarLicitacoesPDF(licAtual, nomeArquivo);
```

---

## Checklist de Verificação

### Antes de Deploy
- [ ] Build sem erros: `npm run build`
- [ ] Lint sem erros: `npm run lint`
- [ ] Drag & drop funciona em dispositivos móveis
- [ ] Exportação gera arquivos válidos
- [ ] Compartilhamento gera links únicos
- [ ] Estatísticas calculam corretamente
- [ ] Campo de lista salva corretamente

### Funcionalidades Críticas
- [ ] Campo `ordem` em FavoritaLista atualiza
- [ ] Campo `lista_favorita_id` em Licitacao atualiza
- [ ] Link compartilhado abre corretamente
- [ ] Arquivo exportado abre em Excel/PDF
- [ ] Drag & drop não quebra índices

---

## Troubleshooting

### Drag & Drop não reordena
```javascript
// Verificar:
1. @hello-pangea/dnd está instalado? → npm list @hello-pangea/dnd
2. Imports estão corretos?
3. handleDragDropListas está sendo chamado?
4. Log: console.log(result) em handleDragDropListas
```

### Exportação não baixa arquivo
```javascript
// Verificar:
1. Função exportarLicitacoesPDF/Excel existe?
2. jsPDF está instalado?
3. Licitações têm dados válidos?
4. Log: console.log(licitacoes) antes de exportar
```

### Compartilhamento não gera link
```javascript
// Verificar:
1. Entity ResultadoCompartilhado existe?
2. Erro de criação no console?
3. ShareDialog está recebendo props corretas?
4. Window.location.origin é correto?
```

### Estatísticas mostra zero
```javascript
// Verificar:
1. listaAtual está selecionada?
2. filtradas tem licitações?
3. calcularEstatisticas() recebe dados?
4. Log: console.log(stats) em ListaStatsCard
```

---

## Performance e Boas Práticas

### Otimizações Implementadas
- ✓ `useMemo` para cálculos de estatísticas
- ✓ Lazy loading de listas
- ✓ Validação antes de operações

### Recomendações
1. Não carregar todas as licitações de uma vez (500+ é limite atual)
2. Usar paginação para listas grandes
3. Cachear listas carregadas
4. Debounce em buscas
5. Virtualizar listas se > 1000 itens

### Padrões de Código
- Use `toArray()` para converter responses
- Sempre use `try/catch` em operações async
- Valide dados antes de operações críticas
- Use `useMemo` para cálculos pesados

---

## Referências

### Documentação Oficial
- [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)
- [Base44 SDK](https://docs.base44.com/)
- [jsPDF](https://github.com/parallax/jspdf)
- [Tailwind CSS](https://tailwindcss.com/)

### Arquivos Relacionados
- `exportarLicitacoesPDF.js` - Geração de PDF
- `exportarLicitacoesExcel.js` - Geração de CSV
- `ShareDialog.jsx` - Compartilhamento
- `LicitacaoCard.jsx` - Card individual

---

**Versão:** 1.0  
**Última atualização:** 10 de agosto de 2026  
**Desenvolvido por:** Data5 Tecnologia
