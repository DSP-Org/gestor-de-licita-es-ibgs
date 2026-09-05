import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Loader2, Eye } from "lucide-react";
import { STATUS_OPTIONS } from "@/shared/alertaApi";

const rotulo = "text-muted-foreground text-xs uppercase tracking-wide font-semibold block mb-1";
const campo =
  "w-full h-9 px-2 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";

// Triagem direto no card, para não obrigar a abrir o detalhe só para classificar.
// `listas` vem do pai já carregado — buscar aqui dispararia uma consulta por card.
// `empilhado` é usado no popover da tabela, onde não há largura para as colunas.
export default function GestaoRapida({ licitacao, listas = [], onUpdated, onUpdate, empilhado = false }) {
  const [salvando, setSalvando] = useState(null);
  const [erro, setErro] = useState("");

  const atualizar = async (campos, marcador) => {
    setSalvando(marcador);
    setErro("");
    try {
      if (onUpdate) await onUpdate(licitacao, campos);
      else await base44.entities.Licitacao.update(licitacao.id, campos);
      Object.entries(campos).forEach(([k, v]) => onUpdated?.(licitacao.id, k, v));
    } catch (e) {
      setErro(e?.message || "Não foi possível salvar.");
    } finally {
      setSalvando(null);
    }
  };

  const lida = licitacao.status_leitura === "lida";

  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <div className={empilhado ? "space-y-2" : "grid grid-cols-2 sm:grid-cols-3 gap-3"}>
        <div>
          <label className={rotulo} htmlFor={`status-${licitacao.id}`}>Status</label>
          <select
            id={`status-${licitacao.id}`}
            value={licitacao.status || "interessado"}
            disabled={salvando === "status"}
            onChange={(e) => atualizar({ status: e.target.value }, "status")}
            className={campo}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={rotulo} htmlFor={`lista-${licitacao.id}`}>Lista</label>
          <select
            id={`lista-${licitacao.id}`}
            value={licitacao.lista_favorita_id || ""}
            disabled={salvando === "lista"}
            onChange={(e) => {
              const listaId = e.target.value;
              // Vincular a uma lista implica favoritar, senão a licitação ficaria
              // com lista definida mas fora da aba Favoritas.
              atualizar(
                listaId ? { lista_favorita_id: listaId, favorito: true } : { lista_favorita_id: "" },
                "lista",
              );
            }}
            className={campo}
          >
            <option value="">Sem lista</option>
            {listas.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        </div>

        <div className={empilhado ? "" : "col-span-2 sm:col-span-1"}>
          <span className={rotulo}>Leitura</span>
          <button
            onClick={() => atualizar({ status_leitura: lida ? "nova" : "lida" }, "leitura")}
            disabled={salvando === "leitura"}
            className={`${campo} inline-flex items-center justify-center gap-1.5 font-medium transition-colors ${
              lida
                ? "bg-green-50 text-green-700 border-green-200"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {salvando === "leitura" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : lida ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            {lida ? "Lida" : "Marcar como lida"}
          </button>
        </div>
      </div>

      {erro && <p className="text-[11px] text-red-600">{erro}</p>}
    </div>
  );
}