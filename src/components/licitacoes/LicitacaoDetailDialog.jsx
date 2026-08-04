import { useState, useEffect } from "react";
import { X, ExternalLink, Star, Save } from "lucide-react";
import { STATUS_OPTIONS } from "@/shared/alertaApi";
import { StatusBadge, formatValor } from "./LicitacaoCard";

export default function LicitacaoDetailDialog({ licitacao, onClose, onSave }) {
  const [status, setStatus] = useState(licitacao?.status || "interessado");
  const [favorito, setFavorito] = useState(!!licitacao?.favorito);
  const [notas, setNotas] = useState(licitacao?.notas || "");
  const [valorProposta, setValorProposta] = useState(licitacao?.valor_proposta || "");

  useEffect(() => {
    if (licitacao) {
      setStatus(licitacao.status || "interessado");
      setFavorito(!!licitacao.favorito);
      setNotas(licitacao.notas || "");
      setValorProposta(licitacao.valor_proposta || "");
    }
  }, [licitacao]);

  if (!licitacao) return null;

  const handleSave = () => {
    onSave({
      ...licitacao,
      status,
      favorito,
      notas,
      valor_proposta: valorProposta === "" ? null : Number(valorProposta),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-xs font-mono text-muted-foreground">{licitacao.id_licitacao}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold leading-snug">{licitacao.titulo}</h2>
            <button
              onClick={() => setFavorito(!favorito)}
              className={`p-2 rounded-md border ${favorito ? "bg-amber-50 border-amber-300" : "hover:bg-muted"}`}
            >
              <Star className={`w-4 h-4 ${favorito ? "fill-amber-400 text-amber-400" : ""}`} />
            </button>
          </div>

          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Objeto</h4>
            <p className="text-sm leading-relaxed">{licitacao.objeto || "—"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Órgão" value={licitacao.orgao} />
            <Info label="Município" value={`${licitacao.municipio || "—"} / ${licitacao.uf || "—"}`} />
            <Info label="Modalidade" value={licitacao.tipo} />
            <Info label="Valor estimado" value={formatValor(licitacao.valor)} />
            <Info label="Abertura" value={licitacao.aberturaComHora || licitacao.abertura} />
            <Info label="Código IBGE" value={licitacao.municipio_ibge} />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor da proposta (R$)</label>
              <input
                type="number"
                value={valorProposta}
                onChange={(e) => setValorProposta(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Anotações</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
                placeholder="Adicione observações sobre esta licitação..."
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {licitacao.link && (
              <a href={licitacao.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-muted">
                <ExternalLink className="w-4 h-4" /> Ver no Alerta Licitação
              </a>
            )}
            {licitacao.link_externo && (
              <a href={licitacao.link_externo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-muted">
                <ExternalLink className="w-4 h-4" /> Portal oficial
              </a>
            )}
            <button
              onClick={handleSave}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90"
            >
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}