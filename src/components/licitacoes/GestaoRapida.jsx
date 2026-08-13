import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Loader2, Folder, Tag, Eye } from "lucide-react";
import { STATUS_OPTIONS } from "@/shared/alertaApi";

// Controles de triagem exibidos direto no card, para não obrigar a abrir o
// detalhe só para classificar. `listas` vem do pai já carregado — carregar aqui
// dispararia uma consulta por card.
export default function GestaoRapida({ licitacao, listas = [], onUpdated }) {
  const [salvando, setSalvando] = useState(null);
  const [erro, setErro] = useState("");

  const atualizar = async (campo, valor) => {
    setSalvando(campo);
    setErro("");
    try {
      await base44.entities.Licitacao.update(licitacao.id, { [campo]: valor });
      onUpdated?.(licitacao.id, campo, valor);
    } catch (e) {
      setErro(e?.message || "Não foi possível salvar.");
    } finally {
      setSalvando(null);
    }
  };

  const lida = licitacao.status_leitura === "lida";

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex items-center gap-1.5 text-xs">
          <Tag className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <span className="sr-only">Status de gestão</span>
          <select
            value={licitacao.status || "interessado"}
            disabled={salvando === "status"}
            onChange={(e) => atualizar("status", e.target.value)}
            className="flex-1 min-w-0 px-2 py-1.5 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-xs">
          <Folder className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <span className="sr-only">Lista de favoritos</span>
          <select
            value={licitacao.lista_favorita_id || ""}
            disabled={salvando === "lista_favorita_id"}
            onChange={(e) => {
              const listaId = e.target.value;
              // Vincular a uma lista implica favoritar — sem isso a licitação
              // ficaria com lista definida mas fora da aba Favoritas.
              atualizar("lista_favorita_id", listaId);
              if (listaId && !licitacao.favorito) atualizar("favorito", true);
            }}
            className="flex-1 min-w-0 px-2 py-1.5 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            <option value="">Sem lista</option>
            {listas.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={() => atualizar("status_leitura", lida ? "nova" : "lida")}
        disabled={salvando === "status_leitura"}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
          lida
            ? "bg-green-50 text-green-700 border-green-200"
            : "text-muted-foreground border-border/70 hover:bg-muted"
        }`}
      >
        {salvando === "status_leitura" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : lida ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )}
        {lida ? "Lida" : "Marcar como lida"}
      </button>

      {erro && <p className="text-[11px] text-red-600">{erro}</p>}
    </div>
  );
}
