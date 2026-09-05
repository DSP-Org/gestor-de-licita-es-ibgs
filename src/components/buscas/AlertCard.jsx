import { Pencil, Trash2, Bell, MapPin, Tag, Clock, RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function AlertCard({ busca, onEdit, onDelete, onToggleAtiva, sincronizando, resultadoSync }) {
  const res = resultadoSync[busca.id];
  const dataCriacao = busca.created_date
    ? new Date(busca.created_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : "";

  const tags = [];
  if (busca.uf) tags.push({ label: busca.uf.split(",").length > 1 ? "Todos os estados" : busca.uf, highlight: false });
  else tags.push({ label: "Todos os estados", highlight: false });
  if (busca.modalidade) tags.push({ label: busca.modalidade, highlight: false });
  else tags.push({ label: "Todas as modalidades", highlight: false });
  if (busca.horario_sincronizacao) tags.push({ label: busca.horario_sincronizacao, highlight: true });
  else tags.push({ label: "Diária", highlight: true });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header: ícone + nome + toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
            busca.ativa ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
          }`}>
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-base leading-tight truncate">{busca.nome}</h3>
            {busca.palavra_chave && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Quando houver <strong className="text-slate-700">{busca.palavra_chave}</strong>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onToggleAtiva(busca)}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            busca.ativa ? "bg-emerald-700" : "bg-slate-300"
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            busca.ativa ? "translate-x-6" : "translate-x-0.5"
          }`} />
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <span
            key={i}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${
              tag.highlight
                ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {busca.total_encontrado != null && (
            <span>{busca.total_encontrado} correspondências</span>
          )}
          {dataCriacao && (
            <>
              <span>·</span>
              <span>criado em {dataCriacao}</span>
            </>
          )}
          {res?.novas != null && (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3 h-3" /> {res.novas} novas
            </span>
          )}
          {res?.erro && (
            <span className="inline-flex items-center gap-1 text-red-500 font-medium" title={res.erro}>
              <AlertCircle className="w-3 h-3" /> Falha
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(busca)}
            title="Editar"
            className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(busca)}
            title="Excluir"
            className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}