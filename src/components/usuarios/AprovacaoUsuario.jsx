import { Check, X } from "lucide-react";

export default function AprovacaoUsuario({ usuario, onChange }) {
  if (usuario.role === "admin") return null;
  const status = usuario.approval_status || "pending";

  return (
    <div className="flex items-center gap-1.5">
      {status !== "approved" && (
        <button onClick={() => onChange(usuario, "approved")} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground" title="Liberar acesso">
          <Check className="h-3.5 w-3.5" /> Liberar
        </button>
      )}
      {status === "approved" && (
        <button onClick={() => onChange(usuario, "rejected")} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10" title="Bloquear acesso">
          <X className="h-3.5 w-3.5" /> Bloquear
        </button>
      )}
    </div>
  );
}