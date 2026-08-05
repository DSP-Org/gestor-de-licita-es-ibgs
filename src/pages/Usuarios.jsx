import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Trash2, Shield, User as UserIcon, Loader2, Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import AprovacaoUsuario from "@/components/usuarios/AprovacaoUsuario";
import { toArray } from "@/lib/toArray";

export default function Usuarios({ embedded = false }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [role, setRole] = useState("user");
  const [invitando, setInvitando] = useState(false);
  const [liberarJa, setLiberarJa] = useState(true);
  const [msg, setMsg] = useState("");

  const carregar = async () => {
    setLoading(true);
    setErro("");
    try {
      const lista = await base44.entities.User.list("-created_date", 100);
      setUsuarios(toArray(lista));
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
    if (senha && senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha && senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    setInvitando(true);
    setMsg("");
    setErro("");
    try {
      const alvo = email.trim();
      if (senha) {
        // Cria usuário com senha definida pelo admin
        await base44.auth.register({ email: alvo, password: senha });
      } else {
        // Convite tradicional — usuário define a própria senha depois
        await base44.users.inviteUser(alvo, role);
      }
      // Atualiza role e status de aprovação
      const encontrados = toArray(await base44.entities.User.filter({ email: alvo }));
      if (encontrados[0]) {
        const atualizacoes = {};
        if (encontrados[0].role !== role) atualizacoes.role = role;
        if (liberarJa) atualizacoes.approval_status = "approved";
        if (Object.keys(atualizacoes).length > 0) {
          await base44.entities.User.update(encontrados[0].id, atualizacoes);
        }
      }
      setMsg(
        senha
          ? `Usuário ${alvo} criado com a senha definida${liberarJa ? " e acesso liberado" : ""}.`
          : liberarJa
            ? `Usuário ${alvo} criado com acesso liberado.`
            : `Convite enviado para ${alvo}. Acesso ficará pendente de liberação.`
      );
      setEmail("");
      setSenha("");
      setConfirmarSenha("");
      carregar();
    } catch (e) {
      setErro(e.message || "Erro ao criar usuário.");
    } finally {
      setInvitando(false);
    }
  };

  const alterarAcesso = async (usuario, approval_status) => {
    setErro("");
    try {
      await base44.entities.User.update(usuario.id, { approval_status });
      setUsuarios((atuais) => atuais.map((item) => item.id === usuario.id ? { ...item, approval_status } : item));
    } catch (e) {
      setErro(e.message || "Erro ao alterar o acesso do usuário.");
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
    <div className={embedded ? "space-y-5" : "p-4 sm:p-6 space-y-5 max-w-4xl mx-auto"}>
      {!embedded && (
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastros novos ficam pendentes até que um administrador libere o acesso.</p>
        </div>
      )}

      <form onSubmit={convidar} className="bg-card border rounded-lg p-4 space-y-3">
        <h3 className="font-heading font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4" /> Criar / convidar usuário</h3>
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
            {senha ? "Criar com senha" : liberarJa ? "Criar" : "Convidar"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha (opcional — defina para o usuário)"
              className="w-full pl-9 pr-9 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type={mostrarSenha ? "text" : "password"}
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            placeholder="Confirmar senha"
            disabled={!senha}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={liberarJa}
            onChange={(e) => setLiberarJa(e.target.checked)}
            className="w-4 h-4"
          />
          Criar já com acesso liberado (sem esperar aprovação)
        </label>
        <p className="text-xs text-muted-foreground">
          {senha
            ? "O usuário será criado com a senha informada e receberá um e-mail de verificação (OTP) para ativar a conta."
            : "Deixe a senha em branco para enviar um convite — o usuário define a própria senha depois."}
        </p>
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
                <div className="hidden sm:block text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${u.role === "admin" || u.approval_status === "approved" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {u.role === "admin" ? "Admin" : u.approval_status === "approved" ? "Liberado" : u.approval_status === "rejected" ? "Bloqueado" : "Pendente"}
                  </span>
                </div>
                <AprovacaoUsuario usuario={u} onChange={alterarAcesso} />
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