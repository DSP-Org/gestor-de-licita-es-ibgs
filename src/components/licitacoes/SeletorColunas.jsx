import { Settings } from "lucide-react";
import { useEffect, useState } from "react";

const COLUNAS_DISPONIVEIS = [
  { id: "licitacao", label: "Licitação", obrigatoria: true },
  { id: "status", label: "Status" },
  { id: "local", label: "Local" },
  { id: "modalidade", label: "Modalidade" },
  { id: "abertura", label: "Abertura" },
  { id: "valor", label: "Valor" },
];

export default function SeletorColunas({ onChangeVisibilidade }) {
  const [aberto, setAberto] = useState(false);
  const [colunasVisiveis, setColunasVisiveis] = useState(
    new Set(COLUNAS_DISPONIVEIS.map(c => c.id))
  );

  useEffect(() => {
    const salvo = localStorage.getItem("licitacoes-colunas-visiveis");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        setColunasVisiveis(new Set(parsed));
        onChangeVisibilidade(new Set(parsed));
      } catch (e) {
        console.error("Erro ao carregar colunas salvas:", e);
      }
    }
  }, []);

  const toggleColuna = (colunaId) => {
    if (COLUNAS_DISPONIVEIS.find(c => c.id === colunaId)?.obrigatoria) return;

    const novasVisiveis = new Set(colunasVisiveis);
    if (novasVisiveis.has(colunaId)) {
      novasVisiveis.delete(colunaId);
    } else {
      novasVisiveis.add(colunaId);
    }

    setColunasVisiveis(novasVisiveis);
    onChangeVisibilidade(novasVisiveis);
    localStorage.setItem("licitacoes-colunas-visiveis", JSON.stringify(Array.from(novasVisiveis)));
  };

  return (
    <div className="relative">
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
