import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Trash2, GripVertical, Building2, MapPin } from "lucide-react";
import BadgeUrgencia from "./BadgeUrgencia";
import { STATUS_OPTIONS } from "@/shared/alertaApi";

export default function KanbanFunil({
  licitacoes,
  etapas,
  onMudarStatus,
  onSelect,
  onRemoverFavorito,
  formatarMoeda,
}) {
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const novoStatus = destination.droppableId;
    onMudarStatus(draggableId, novoStatus);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
        {etapas.map((etapa) => {
          const itensEtapa = licitacoes.filter((l) => (l.status || "interessado") === etapa.id);
          const totalEtapaValor = itensEtapa.reduce((s, l) => s + (Number(l.valor) || 0), 0);

          return (
            <div
              key={etapa.id}
              className={`rounded-xl border ${etapa.color} p-3 flex flex-col gap-3 min-w-[250px] shadow-xs`}
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div>
                  <h4 className="font-bold text-xs leading-tight">{etapa.label}</h4>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {formatarMoeda(totalEtapaValor)}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${etapa.badgeColor}`}>
                  {itensEtapa.length}
                </span>
              </div>

              {/* Área Droppable da Coluna */}
              <Droppable droppableId={etapa.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2.5 min-h-[220px] rounded-lg transition-colors p-1 ${
                      snapshot.isDraggingOver ? "bg-primary/10 ring-2 ring-primary/30 ring-dashed" : ""
                    }`}
                  >
                    {itensEtapa.length === 0 ? (
                      <div className="text-center py-10 text-xs text-muted-foreground/60 border border-dashed rounded-lg bg-background/50">
                        Arraste cards para cá
                      </div>
                    ) : (
                      itensEtapa.map((lic, index) => (
                        <Draggable key={lic.id} draggableId={lic.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onSelect(lic)}
                              className={`bg-card border border-border/80 rounded-xl p-3.5 shadow-xs hover:shadow-lg transition-all duration-300 cursor-grab active:cursor-grabbing space-y-2.5 group hover:border-primary/40 relative overflow-hidden ${
                                snapshot.isDragging
                                  ? "shadow-2xl ring-2 ring-primary scale-[1.03] rotate-1 z-50 bg-card border-primary"
                                  : "hover:-translate-y-0.5"
                              }`}
                            >
                              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="flex items-start justify-between gap-1.5">
                                <p className="font-semibold text-xs leading-snug line-clamp-2 text-foreground flex-1">
                                  {lic.titulo}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoverFavorito(lic);
                                  }}
                                  title="Remover do painel"
                                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-0.5 shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Badge de Urgência de Prazo */}
                              {(lic.abertura_datetime || lic.abertura) && (
                                <div className="pt-0.5">
                                  <BadgeUrgencia
                                    abertura_datetime={lic.abertura_datetime}
                                    abertura={lic.abertura}
                                  />
                                </div>
                              )}

                              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                <Building2 className="w-3 h-3 shrink-0 opacity-70" />
                                <span>{lic.orgao || "—"}</span>
                              </p>

                              <div className="flex items-center justify-between text-[11px] pt-1 border-t text-muted-foreground">
                                <span className="flex items-center gap-0.5 truncate max-w-[130px]">
                                  <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                                  {lic.uf} • {lic.municipio || "—"}
                                </span>
                                <span className="font-bold text-primary shrink-0">
                                  {(Number(lic.valor) || 0).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>

                              {/* Seletor rápido alternativo no rodapé para mobile / acessibilidade */}
                              <div className="pt-1.5 border-t" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={lic.status || "interessado"}
                                  onChange={(e) => onMudarStatus(lic.id, e.target.value)}
                                  className="w-full text-[10px] px-1.5 py-1 bg-muted/40 border rounded font-medium focus:outline-none text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                      Mover: {s.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}