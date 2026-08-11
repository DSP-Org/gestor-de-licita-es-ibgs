import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Loader2 } from "lucide-react";

export default function SeletorDestinatarios({ busca, onUpdated }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [selecionados, setSelecionados] = useState(busca.destinatarios_email || []);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  useEffect(() => {
    setSelecionados(busca.destinatarios_email || []);
  }, [busca.destinatarios_email]);

  const carregarUsuarios = async () => {
    try {
      const lista = await base44.entities.User.list("-created_date", 200);
      setUsuarios(Array.isArray(lista) ? lista : Object.values(lista || {}));
    } finally {
      setCarregando(false);
    }
  };

  const toggleDestinatario = async (userId) => {
    const novosSelecionados = selecionados.includes(userId)
      ? selecionados.filter((id) => id !== userId)
      : [...selecionados, userId];

    setSelecionados(novosSelecionados);
    await salvar(novosSelecionados);
  };

  const salvar = async (novosSelecionados) => {
    setAtualizando(true);
    try {
      await base44.entities.BuscaSalva.update(busca.id, {
        destinatarios_email: novosSelecionados,
      });
      onUpdated?.(busca.id, "destinatarios_email", novosSelecionados);
    } finally {
      setAtualizando(false);
    }
  };

  const selecionarTodos = () => {
    const todos = usuarios.map((u) => u.id);
    setSelecionados(todos);
    salvar(todos);
  };

  const limpar = () => {
    setSelecionados([]);
    salvar([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Users className="w-3 h-3" /> Destinatários do e-mail
        </label>
        {usuarios.length > 0 && (
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={selecionarTodos}
              disabled={atualizando}
              className="text-primary hover:underline disabled:opacity-50"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              onClick={limpar}
              disabled={atualizando}
              className="text-muted-foreground hover:underline disabled:opacity-50"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {carregando ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Carregando usuários...
        </p>
      ) : usuarios.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum usuário cadastrado. O e-mail será enviado ao dono da busca.
        </p>
      ) : (
        <div className="max-h-32 overflow-auto border rounded-md p-2 space-y-1">
          {usuarios.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-muted rounded px-1"
            >
              <input
                type="checkbox"
                checked={selecionados.includes(u.id)}
                onChange={() => toggleDestinatario(u.id)}
                disabled={atualizando}
                className="w-4 h-4"
              />
              <span className="min-w-0 truncate">{u.full_name || u.email}</span>
              {u.email && (
                <span className="text-xs text-muted-foreground truncate">
                  · {u.email}
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {selecionados.length} selecionado(s). Se nenhum for escolhido, avisa o
        dono da busca.
      </p>
    </div>
  );
}
