import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

export default function DestinatarioForm({ onSave }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const submit = async () => {
    const mail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await onSave({ nome: nome.trim(), email: mail });
      setNome("");
      setEmail("");
    } catch (e) {
      setErro(e?.message || "Não foi possível salvar o destinatário.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: João Silva"
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">E-mail *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="email@empresa.com"
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <button
        onClick={submit}
        disabled={salvando}
        className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Cadastrar destinatário
      </button>
    </div>
  );
}