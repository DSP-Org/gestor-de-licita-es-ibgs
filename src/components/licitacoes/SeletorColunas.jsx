import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const COLUNAS_DISPONIVEIS = [
  { id: "licitacao", label: "Licitação", obrigatoria: true },
  { id: "status", label: "Status" },
  { id: "local", label: "Local" },
  { id: "modalidade", label: "Modalidade" },
  { id: "publicacao", label: "Publicação" },
  { id: "sincronizacao", label: "Sincronização" },
  { id: "abertura", label: "Abertura" },
  { id: "valor", label: "Valor" },
];

const CHAVE = "licitacoes-colunas-visiveis";

// Colunas que existiam antes de a preferência passar a registrar quais eram
// conhecidas. Preferências no formato antigo (um array simples) são lidas como
// se conhecessem apenas estas.
const COLUNAS_FORMATO_ANTIGO = ["licitacao", "status", "local", "modalidade", "abertura", "valor"];

const TODAS = COLUNAS_DISPONIVEIS.map((c) => c.id);

// Guardamos as visíveis e também as colunas que existiam no momento de salvar.
// Sem isso não dá para distinguir "o usuário escondeu" de "a coluna nem existia",
// e toda coluna nova nasceria invisível para quem já tinha mexido nas preferências.
function carregarPreferencia() {
  const bruto = localStorage.getItem(CHAVE);
  if (!bruto) return new Set(TODAS);

  try {
    const dados = JSON.parse(bruto);
    const visiveis = Array.isArray(dados) ? dados : dados.visiveis;
    const conhecidas = Array.isArray(dados) ? COLUNAS_FORMATO_ANTIGO : dados.conhecidas;
    if (!Array.isArray(visiveis) || !Array.isArray(conhecidas)) return new Set(TODAS);

    const escolhidas = visiveis.filter((id) => TODAS.includes(id));
    const ineditas = TODAS.filter((id) => !conhecidas.includes(id));
    return new Set([...escolhidas, ...ineditas]);
  } catch {
    return new Set(TODAS);
  }
}

function salvarPreferencia(visiveis) {
  localStorage.setItem(
    CHAVE,
    JSON.stringify({ visiveis: Array.from(visiveis), conhecidas: TODAS }),
  );
}

export default function SeletorColunas({ onChangeVisibilidade }) {
  const [aberto, setAberto] = useState(false);
  const [colunasVisiveis, setColunasVisiveis] = useState(() => new Set(TODAS));
  const ref = useRef(null);

  useEffect(() => {
    const efetivas = carregarPreferencia();
    setColunasVisiveis(efetivas);
    onChangeVisibilidade(efetivas);
    // Regrava já no formato novo para que a próxima coluna adicionada
    // também apareça sozinha.
    salvarPreferencia(efetivas);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (!ref.current?.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  const toggleColuna = (colunaId) => {
    if (COLUNAS_DISPONIVEIS.find((c) => c.id === colunaId)?.obrigatoria) return;

    const novasVisiveis = new Set(colunasVisiveis);
    if (novasVisiveis.has(colunaId)) novasVisiveis.delete(colunaId);
    else novasVisiveis.add(colunaId);

    setColunasVisiveis(novasVisiveis);
    onChangeVisibilidade(novasVisiveis);
    salvarPreferencia(novasVisiveis);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto(!aberto)}
        title="Configurar colunas"
        className="p-2 rounded-lg border border-border/70 hover:bg-muted transition-colors"
      >
        <Settings className="w-4 h-4" />
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 bg-card border rounded-lg shadow-lg p-3 z-50 min-w-48">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Colunas visíveis</p>
          <div className="space-y-2">
            {COLUNAS_DISPONIVEIS.map((col) => (
              <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={colunasVisiveis.has(col.id)}
                  onChange={() => toggleColuna(col.id)}
                  disabled={col.obrigatoria}
                  className="w-4 h-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm">{col.label}</span>
                {col.obrigatoria && <span className="text-xs text-muted-foreground">(obrigatória)</span>}
              </label>
            ))}
          </div>
          <button
            onClick={() => setAberto(false)}
            className="w-full mt-3 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

export { COLUNAS_DISPONIVEIS };
