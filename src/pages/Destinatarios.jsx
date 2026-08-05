import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Mail } from "lucide-react";
import { toArray } from "@/lib/toArray";
import DestinatarioForm from "@/components/destinatarios/DestinatarioForm";

export default function Destinatarios() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Destinatario.list("-created_date", 200);
      setLista(toArray(res));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvar = async (dados) => {
    await base44.entities.Destinatario.create(dados);
    carregar();
  };

  const remover = async (item) => {
    if (!window.confirm(`Excluir ${item.email} da lista de destinatários?`)) return;
    await base44.entities.Destinatario.delete(item.id);
    setLista((prev) => prev.filter((d) => d.id !== item.id));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-heading text-xl sm:text-3xl font-bold tracking-tight">Destinatários</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lista de e-mails usada em todo o sistema para enviar licitações.
        </p>
      </div>

      <DestinatarioForm onSave={salvar} />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando destinatários...</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum destinatário cadastrado ainda.</div>
      ) : (
        <div className="space-y-2">
          {lista.map((d) => (
            <div key={d.id} className="bg-card border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent text-primary flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                {d.nome && <p className="text-sm font-medium truncate">{d.nome}</p>}
                <p className="text-xs text-muted-foreground truncate">{d.email}</p>
              </div>
              <button
                onClick={() => remover(d)}
                title="Excluir"
                className="p-2 rounded-lg border hover:bg-red-50 hover:text-red-600 hover:border-red-200 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}