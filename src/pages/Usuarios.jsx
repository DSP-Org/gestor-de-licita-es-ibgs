import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Trash2, Shield, User as UserIcon, Loader2, Mail, KeyRound, Eye, EyeOff, Building2, Plus, Pencil, RefreshCw } from "lucide-react";
import AprovacaoUsuario from "@/components/usuarios/AprovacaoUsuario";
import { toArray } from "@/lib/toArray";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";

export default function Usuarios({ embedded = false }) {
  // isAdmin aqui reflete o master (único e-mail com RLS de escrita em
  // UnidadeNegocio) — só ele pode ver/usar a exclusão de unidade.
  const { isAdmin: isMaster } = useUnidadeFilter();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [role, setRole] = useState("user");
  const [unidadeIds, setUnidadeIds] = useState([]);
  const [invitando, setInvitando] = useState(false);
  const [liberarJa, setLiberarJa] = useState(true);
  const [msg, setMsg] = useState("");

  // Unidades de negócio
  const [unidades, setUnidades] = useState([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [novaUnidadeNome, setNovaUnidadeNome] = useState("");
  const [editandoUnidade, setEditandoUnidade] = useState(null);
  const [salvandoUnidade, setSalvandoUnidade] = useState(false);

  // Migração usuario_id -> unidade_negocio_id (rodar uma única vez)
  const [migrando, setMigrando] = useState(false);
  const [resultadoMigracao, setResultadoMigracao] = useState(null);

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

  const carregarUnidades = async () => {
    setLoadingUnidades(true);
    try {
      const lista = await base44.entities.UnidadeNegocio.list("nome", 200);
      setUnidades(toArray(lista));
    } catch (e) {
      console.error("Erro ao carregar unidades de negócio:", e);
    } finally {
      setLoadingUnidades(false);
    }
  };

  useEffect(() => {
    carregar();
    carregarUnidades();
  }, []);

  const salvarUnidade = async (e) => {
    e.preventDefault();
    if (!novaUnidadeNome.trim()) return;
    setSalvandoUnidade(true);
    try {
      if (editandoUnidade) {
        await base44.entities.UnidadeNegocio.update(editandoUnidade.id, { nome: novaUnidadeNome.trim() });
      } else {
        await base44.entities.UnidadeNegocio.create({ nome: novaUnidadeNome.trim() });
      }
      setNovaUnidadeNome("");
      setEditandoUnidade(null);
      carregarUnidades();
    } catch (e) {
      setErro(e.message || "Erro ao salvar unidade de negócio.");
    } finally {
      setSalvandoUnidade(false);
    }
  };

  const editarUnidade = (unidade) => {
    setEditandoUnidade(unidade);
    setNovaUnidadeNome(unidade.nome);
  };

  const removerUnidade = async (unidade) => {
    const vinculados = usuarios.filter((u) => (u.unidades_negocio_ids || []).includes(unidade.id)).length;
    const aviso = vinculados > 0
      ? `${vinculados} usuário(s) ainda estão vinculados a "${unidade.nome}" — as licitações, buscas e favoritos dessa unidade continuam no banco, só deixam de aparecer no seletor. `
      : "";
    if (!confirm(`${aviso}Excluir a unidade "${unidade.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await base44.entities.UnidadeNegocio.delete(unidade.id);
      if (editandoUnidade?.id === unidade.id) {
        setEditandoUnidade(null);
        setNovaUnidadeNome("");
      }
      carregarUnidades();
    } catch (e) {
      setErro(e.message || "Erro ao excluir unidade de negócio.");
    }
  };

  const toggleUnidadeForm = (id) => {
    setUnidadeIds((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  };

  const rodarMigracao = async () => {
    if (!confirm("Isso cria uma unidade para cada usuário sem unidade e migra os dados existentes (licitações, buscas, favoritos, destinatários) para as unidades correspondentes. Pode ser executado mais de uma vez sem duplicar nada. Continuar?")) return;
    setMigrando(true);
    setResultadoMigracao(null);
    try {
      const res = await base44.functions.invoke("migrarUnidadesNegocio");
      if (res.data?.error) throw new Error(res.data.error);
      setResultadoMigracao(res.data);
      carregarUnidades();
      carregar();
    } catch (e) {
      setResultadoMigracao({ error: e.message });
    } finally {
      setMigrando(false);
    }
  };

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
      // Atualiza role, unidades de negócio e status de aprovação
      const encontrados = toArray(await base44.entities.User.filter({ email: alvo }));
      if (encontrados[0]) {
        const atualizacoes = {};
        if (encontrados[0].role !== role) atualizacoes.role = role;
        if (unidadeIds.length > 0) {
          atualizacoes.unidades_negocio_ids = unidadeIds;
          atualizacoes.unidade_negocio_id = unidadeIds[0];
        }
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
      setUnidadeIds([]);
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

  // Alterna a unidade dada dentro de unidades_negocio_ids (as permitidas do
  // usuário). Se a unidade ativa (unidade_negocio_id) deixar de estar entre
  // as permitidas, escolhe outra permitida ou fica sem nenhuma.
  const toggleMembroUnidade = async (usuario, unidadeId) => {
    setErro("");
    const atuais = Array.isArray(usuario.unidades_negocio_ids) ? usuario.unidades_negocio_ids : [];
    const novasIds = atuais.includes(unidadeId) ? atuais.filter((id) => id !== unidadeId) : [...atuais, unidadeId];
    const novaAtiva = novasIds.includes(usuario.unidade_negocio_id) ? usuario.unidade_negocio_id : (novasIds[0] || null);
    try {
      await base44.entities.User.update(usuario.id, { unidades_negocio_ids: novasIds, unidade_negocio_id: novaAtiva });
      setUsuarios((atuaisLista) => atuaisLista.map((item) =>
        item.id === usuario.id ? { ...item, unidades_negocio_ids: novasIds, unidade_negocio_id: novaAtiva } : item
      ));
    } catch (e) {
      setErro(e.message || "Erro ao vincular o usuário à unidade.");
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

      <div className="bg-card border rounded-lg p-4 space-y-3">
        <h3 className="font-heading font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" /> Unidades de Negócio</h3>
        <p className="text-xs text-muted-foreground">
          Um usuário pode pertencer a mais de uma unidade, mas atua em uma unidade ativa por vez (alterna pelo
          seletor no menu). Dados (licitações, buscas, favoritos, destinatários) são compartilhados entre todos
          os usuários que estão com a mesma unidade ativa.
        </p>
        <form onSubmit={salvarUnidade} className="flex gap-2">
          <input
            value={novaUnidadeNome}
            onChange={(e) => setNovaUnidadeNome(e.target.value)}
            placeholder="Nome da unidade"
            required
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={salvandoUnidade}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {salvandoUnidade ? <Loader2 className="w-4 h-4 animate-spin" /> : editandoUnidade ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editandoUnidade ? "Salvar" : "Criar"}
          </button>
          {editandoUnidade && (
            <button
              type="button"
              onClick={() => { setEditandoUnidade(null); setNovaUnidadeNome(""); }}
              className="px-3 py-2 text-sm border rounded-md hover:bg-muted shrink-0"
            >
              Cancelar
            </button>
          )}
        </form>
        {loadingUnidades ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : unidades.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma unidade cadastrada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unidades.map((un) => (
              <div
                key={un.id}
                className="inline-flex items-center gap-1 text-xs pl-2.5 pr-1.5 py-1.5 rounded-full bg-muted"
              >
                <button
                  onClick={() => editarUnidade(un)}
                  className="inline-flex items-center gap-1.5 hover:opacity-70"
                  title="Editar"
                >
                  <Building2 className="w-3 h-3" /> {un.nome}
                </button>
                {isMaster && (
                  <button
                    onClick={() => removerUnidade(un)}
                    className="p-1 rounded-full hover:bg-red-100 hover:text-red-600"
                    title="Excluir unidade"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="border-t pt-3">
          <button
            onClick={rodarMigracao}
            disabled={migrando}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
          >
            {migrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Migrar dados existentes para unidades
          </button>
          <p className="text-xs text-muted-foreground mt-1">
            Cria uma unidade para cada usuário sem unidade e vincula os dados antigos (por usuario_id) a ela.
            Seguro executar mais de uma vez.
          </p>
          {resultadoMigracao && (
            <div className={`text-xs mt-2 p-2 rounded-md ${resultadoMigracao.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {resultadoMigracao.error
                ? `Erro: ${resultadoMigracao.error}`
                : `${resultadoMigracao.unidadesCriadas} unidade(s) criada(s). ${Object.entries(resultadoMigracao.resumo || {}).map(([nome, r]) => `${nome}: ${r.atualizados}/${r.total}`).join(" · ")}`}
            </div>
          )}
        </div>
      </div>

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
            <option value="user">Usuário (vê só os da unidade)</option>
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
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Unidades (a primeira marcada vira a unidade ativa)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {unidades.length === 0 ? (
              <p className="text-xs text-muted-foreground">Cadastre uma unidade acima primeiro.</p>
            ) : (
              unidades.map((un) => (
                <button
                  key={un.id}
                  type="button"
                  onClick={() => toggleUnidadeForm(un.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                    unidadeIds.includes(un.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {un.nome}
                </button>
              ))
            )}
          </div>
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
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer list-none inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {(u.unidades_negocio_ids || []).length > 0
                          ? unidades
                              .filter((un) => (u.unidades_negocio_ids || []).includes(un.id))
                              .map((un) => (un.id === u.unidade_negocio_id ? `${un.nome} (ativa)` : un.nome))
                              .join(", ")
                          : "Sem unidade"}
                      </span>
                    </summary>
                    <div className="mt-1.5 flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30 max-w-xs">
                      {unidades.map((un) => {
                        const membro = (u.unidades_negocio_ids || []).includes(un.id);
                        return (
                          <button
                            key={un.id}
                            type="button"
                            onClick={() => toggleMembroUnidade(u, un.id)}
                            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                              membro ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                            }`}
                          >
                            {un.nome}
                          </button>
                        );
                      })}
                    </div>
                  </details>
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