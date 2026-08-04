import { useState } from "react";
import { X, Plus } from "lucide-react";

// Editor de múltiplas palavras-chave. Persiste como string separada por vírgula.
export default function PalavrasChaveInput({ value = "", onChange, modo = "qualquer", onChangeModo }) {
  const [texto, setTexto] = useState("");
  const palavras = (value || "").split(",").map((p) => p.trim()).filter(Boolean);

  const commit = (lista) => onChange(lista.join(", "));

  const adicionar = () => {
    const novas = texto.split(",").map((p) => p.trim()).filter(Boolean);
    if (novas.length === 0) return;
    commit([...palavras, ...novas.filter((n) => !palavras.includes(n))]);
    setTexto("");
  };

  const remover = (p) => commit(palavras.filter((x) => x !== p));

  return (
    <div>
      <div className="mt-1 flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              adicionar();
            } else if (e.key === "Backspace" && !texto && palavras.length) {
              remover(palavras[palavras.length - 1]);
            }
          }}
          onBlur={adicionar}
          placeholder='Digite e pressione Enter (ex: engenharia, "coleta de lixo", -limpeza)'
          className="flex-1 min-w-0 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={adicionar}
          className="px-3 py-2 text-sm border rounded-md hover:bg-muted shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {palavras.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {palavras.map((p) => (
            <span
              key={p}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                p.startsWith("-") ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
              }`}
            >
              {p}
              <button type="button" onClick={() => remover(p)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {onChangeModo && palavras.length > 1 && (
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          {[
            { v: "qualquer", t: "Expansivo (qualquer palavra)", d: "Traz a licitação se contiver ao menos uma das palavras." },
            { v: "todas", t: "Restritivo (todas as palavras)", d: "Traz apenas licitações que contenham todas as palavras." },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => onChangeModo(o.v)}
              className={`flex-1 text-left px-3 py-2 border rounded-md text-xs ${
                modo === o.v ? "border-primary bg-muted" : "hover:bg-muted"
              }`}
            >
              <span className="font-medium block">{o.t}</span>
              <span className="text-muted-foreground">{o.d}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        Use <code>-palavra</code> para excluir e aspas para expressões exatas.
      </p>
    </div>
  );
}