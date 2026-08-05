import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Trash2, Shield, User as UserIcon, Loader2, Mail } from "lucide-react";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [invitando, setInvitando] = useState(false);
  const [msg, setMsg] = useState("");

  const carregar = async () => {
    setLoading(true);
    setErro("");
    try {
      const lista = await base44.entities.User.list("-created_date", 100);
      setUsuarios(lista);
    } catch (e) {
      setErro(e.message || "Erro ao carregar usuários. Apenas admins podem acessar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const convidar = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInvitando(true);
    setMsg("");
    setErro("");
    try {
      await base44.users.inviteUser(email.trim(), role);
      setMsg(`Convite enviado para ${email.trim()}.`);
      setEmail("");
      carregar();
    } catch (e) {
      setErro(e.message || "Erro ao convidar usuário.");
    } finally {
      setInvitando(false);
    }
  };

  const remover = async (u) => {
    if (!confirm(`Remover o usuário ${u.email}?`)) return;
    try {
      await base44.entities.User.delete(u.id);
      carregar();
    } catch (e) {
      setErro(e.message || "Erro ao remover usuário.");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground mt-1">Convide usuários para acessar o sistema. Cada um verá apenas suas próprias licitações e buscas.</p>
      </div>

      <form onSubmit={convidar} className="bg-card border rounded-lg p-4 space-y-3">
        <h3 className="font-heading font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4" /> Convidar usuário</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="user">Usuário (vê só os seus)</option>
            <option value="admin">Admin (vê tudo)</option>
          </select>
          <button
            type="submit"
            disabled={invitando}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50 sm:shrink-0"
          >
            {invitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Convidar
          </button>
        </div>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </form>

      <div className="bg-card border rounded-lg">
        <div className="px-4 py-3 border-b">
          <h3 className="font-heading font-semibold">Usuários cadastrados ({usuarios.length})</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="divide-y">
            {usuarios.map((u) => (
              <div key={u.id} className="px-3 sm:px-4 py-3 flex items-center gap-2.5 sm:gap-3">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 ${u.role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {u.role === "admin" ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {u.role === "admin" ? "Admin" : "Usuário"}
                </span>
                <button
                  onClick={() => remover(u)}
                  className="p-1.5 sm:p-2 rounded-md border hover:bg-red-50 hover:text-red-600 shrink-0"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}