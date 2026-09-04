
// Filtros da aba "Acervo": pílulas de estado (Novas/Triagem/...) e de urgência.
// O recorte de quais licitações aparecem vem sempre das buscas ativas em
// Configuração — não há mais seletor de busca aqui, pra não divergir do funil.
export default function AcervoFiltros({
  filtroUrgencia = "todos",
  onChangeUrgencia,
  filtroEstado = "todas",
  onChangeEstado,
  contadoresEstado = {},
}) {
  const opcoesUrgencia = [
    { id: "todos", label: "Todos os Prazos" },
    { id: "hoje", label: "🚨 Disputa Hoje" },
    { id: "urgente", label: "⚠️ Em até 3 dias" },
    { id: "em_breve", label: "📅 Em até 7 dias" },
  ];

  const opcoesEstado = [
    { id: "todas", label: "Todas" },
    { id: "novas", label: "✨ Novas" },
    { id: "triagem", label: "⏱️ Em Triagem" },
    { id: "descartadas", label: "🗑️ Descartadas" },
    { id: "minhas", label: "⭐ Minhas" },
  ];

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Linha 1: Pílulas de Estado no Acervo Geral */}
      {onChangeEstado && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
          {opcoesEstado.map((opt) => {
            const ativo = filtroEstado === opt.id;
            const count = contadoresEstado[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeEstado(opt.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  ativo
                    ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                    : "bg-muted/40 text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{opt.label}</span>
                {typeof count === "number" && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      ativo
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Linha 2: Pílulas de Urgência */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {onChangeUrgencia && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
            {opcoesUrgencia.map((opt) => {
              const ativo = filtroUrgencia === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeUrgencia(opt.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors whitespace-nowrap ${
                    ativo
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}