import { useState } from "react";
import { LayoutGrid, Table, Trash2 } from "lucide-react";
import LicitacaoCard from "./LicitacaoCard";
import LicitacaoTable from "./LicitacaoTable";
import SeletorColunas from "./SeletorColunas";
import { COLUNAS_DISPONIVEIS } from "./SeletorColunas";

export default function LicitacoesVisualizacao({
  licitacoes,
  onRowClick,
  selecionados,
  onToggleSelecao,
  onDelete,
  renderActions,
  // Controles de estado (lista, status, leitura) exibidos no corpo do card.
  renderGestao,
  loading,
  vazio,
}) {
  const [modo, setModo] = useState("cards");
  const [colunasVisiveis, setColunasVisiveis] = useState(
    new Set(COLUNAS_DISPONIVEIS.map(c => c.id))
  );

  if (loading) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Carregando licitações...
      </div>
    );
  }

  if (licitacoes.length === 0 || vazio) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Nenhuma licitação encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de controle */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => setModo("cards")}
          title="Visualização em cards"
          className={`p-2 rounded-lg border transition-colors ${
            modo === "cards"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border/70 hover:bg-muted"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setModo("tabela")}
          title="Visualização em tabela"
          className={`p-2 rounded-lg border transition-colors ${
            modo === "tabela"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border/70 hover:bg-muted"
          }`}
        >
          <Table className="w-4 h-4" />
        </button>
        {modo === "tabela" && (
          <SeletorColunas onChangeVisibilidade={setColunasVisiveis} />
        )}
      </div>

      {/* Conteúdo */}
      {modo === "cards" ? (
        <div className="space-y-3">
          {licitacoes.map((l) => (
            // LicitacaoCard espera onClick/action/selecionado — passar onRowClick
            // e renderActions crus deixava o card sem clique e sem ações.
            <LicitacaoCard
              key={l.id || l.id_licitacao}
              licitacao={l}
              onClick={() => onRowClick?.(l)}
              selecionado={selecionados?.has(l.id_licitacao)}
              onToggleSelecao={onToggleSelecao}
              gestao={renderGestao?.(l)}
              action={
                (renderActions || onDelete) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {renderActions?.(l)}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(l)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Descartar
                      </button>
                    )}
                  </div>
                )
              }
            />
          ))}
        </div>
      ) : (
        <LicitacaoTable
          licitacoes={licitacoes}
          onRowClick={onRowClick}
          selecionados={selecionados}
          onToggleSelecao={onToggleSelecao}
          onDelete={onDelete}
          renderActions={renderActions}
          renderGestao={renderGestao}
          colunasVisiveis={colunasVisiveis}
        />
      )}
    </div>
  );
}
