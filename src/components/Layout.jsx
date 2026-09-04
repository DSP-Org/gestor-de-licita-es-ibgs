import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Users, Settings, BellRing, RefreshCw, MoreHorizontal, X, Sparkles, Radar, ChevronDown } from "lucide-react";
import { useNotificacoesNativas } from "@/hooks/useNotificacoesNativas";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";
import InstalarAppPrompt from "@/components/InstalarAppPrompt";
import { toast } from "@/components/ui/use-toast";

const mainItems = [
  { to: "/", label: "Licitações", icon: RefreshCw, end: true },
  { to: "/minhas-licitacoes", label: "Alertas", icon: BellRing },
  { to: "/assistente", label: "Assistente", icon: Sparkles },
];
const moreItems = [
  { to: "/busca-avancada", label: "Radar", icon: Radar },
  { to: "/buscas", label: "Configuração", icon: Settings },
];
const adminItems = [{ to: "/admin", label: "Administrador", icon: Users }];
const footerItems = [];

function getInitials(name) {
  if (!name) return "NA";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [seletorUnidadeAberto, setSeletorUnidadeAberto] = useState(false);
  const { permissao, solicitarPermissao } = useNotificacoesNativas();
  const location = useLocation();
  const { isAdmin, filtroUnidade, unidades, unidadesPermitidas, trocarUnidadeAtiva, usuarioLogado } = useUnidadeFilter();

  useEffect(() => {
    setMenuAberto(false);
    setSeletorUnidadeAberto(false);
  }, [location.pathname]);

  const allItems = isAdmin ? [...mainItems, ...moreItems, ...adminItems] : [...mainItems, ...moreItems];
  const moreList = isAdmin ? [...moreItems, ...adminItems] : moreItems;
  const moreActive = moreList.some((item) => location.pathname.startsWith(item.to));

  const userInitials = getInitials(usuarioLogado?.full_name || usuarioLogado?.email);

  const handleTrocarUnidade = (novaUnidadeId) => {
    trocarUnidadeAtiva(novaUnidadeId).catch((err) => {
      toast({
        title: "Não foi possível trocar de unidade",
        description: err.message,
        variant: "destructive",
      });
    });
    setSeletorUnidadeAberto(false);
  };

  const mostrarSeletorUnidade = isAdmin || unidadesPermitidas.length >= 1;
  const unidadeUnicaSemEscolha = !isAdmin && unidadesPermitidas.length === 1;
  const opcoesSeletorUnidade = isAdmin ? unidades : unidadesPermitidas;
  const unidadeAtivaNome = opcoesSeletorUnidade.find((u) => u.id === filtroUnidade)?.nome || "Selecionar unidade";

  return (
    <>
      <InstalarAppPrompt />
      <div className="min-h-screen flex bg-background">
        {/* ===== SIDEBAR DESKTOP — tema claro, ícones destacados ===== */}
        <aside className="hidden md:flex flex-col sticky top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border shrink-0">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <RefreshCw className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <p className="font-heading font-extrabold text-sm text-foreground tracking-tight">Licitalerta360</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Data5 Tecnologia</p>
            </div>
          </div>

          {/* Seletor de unidade */}
          {mostrarSeletorUnidade && (
            <div className="px-3 py-3 border-b border-sidebar-border">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                Unidade ativa
              </label>
              {unidadeUnicaSemEscolha ? (
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-muted border border-border text-foreground font-medium truncate">
                  {unidadesPermitidas[0]?.nome}
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setSeletorUnidadeAberto((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg bg-muted border border-border text-foreground font-medium hover:bg-accent transition-colors"
                  >
                    <span className="truncate">{unidadeAtivaNome}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${seletorUnidadeAberto ? "rotate-180" : ""}`} />
                  </button>
                  {seletorUnidadeAberto && (
                    <div className="absolute z-50 mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
                      {opcoesSeletorUnidade.map((un) => (
                        <button
                          key={un.id}
                          onClick={() => handleTrocarUnidade(un.id)}
                          className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-accent transition-colors ${
                            un.id === filtroUnidade ? "text-primary font-bold" : "text-foreground"
                          }`}
                        >
                          {un.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navegação */}
          <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
            {allItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                  }`
                }
                title={item.label}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                    </span>
                    <span className="text-sm truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3">
            {footerItems.map((item) => (
              <button
                key={item.to}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium transition-all"
                title={item.label}
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground shrink-0">
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={2} />
                </span>
                <span className="text-sm truncate">{item.label}</span>
              </button>
            ))}
            {/* User profile */}
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/60 transition-colors">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs bg-primary shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-semibold text-foreground truncate">{usuarioLogado?.full_name || "Usuário"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{usuarioLogado?.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Painel Principal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Mobile — tema claro */}
          <header className="md:hidden h-16 flex items-center gap-3 px-4 sticky top-0 z-20 bg-card border-b border-border shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 leading-tight flex-1">
              <p className="font-heading font-extrabold text-sm text-foreground">Licitalerta360</p>
              {mostrarSeletorUnidade && (
                unidadeUnicaSemEscolha ? (
                  <p className="mt-0.5 max-w-full px-2 py-0.5 text-[11px] rounded-md bg-muted border border-border text-foreground truncate inline-block">
                    {unidadesPermitidas[0]?.nome}
                  </p>
                ) : (
                  <select
                    value={filtroUnidade || ""}
                    onChange={(e) => handleTrocarUnidade(e.target.value)}
                    className="mt-0.5 max-w-full px-2 py-0.5 text-[11px] rounded-md border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {!filtroUnidade && <option value="">Selecione uma unidade</option>}
                    {opcoesSeletorUnidade.map((un) => (
                      <option key={un.id} value={un.id}>{un.nome}</option>
                    ))}
                  </select>
                )
              )}
            </div>
            {permissao !== "granted" && permissao !== "unsupported" && (
              <button
                onClick={solicitarPermissao}
                title="Ativar notificações"
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <BellRing className="w-5 h-5" />
              </button>
            )}
          </header>

          {/* Main Content */}
          <main className="flex-1 pb-20 md:pb-0">
            <Outlet />
          </main>

          {/* ===== Bottom Navigation — Mobile, tema claro ===== */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-stretch px-1 pt-1.5 pb-1">
              {mainItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex-1 flex flex-col items-center gap-1 py-1 text-[10px] font-semibold transition-colors active:scale-95 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex items-center justify-center h-8 w-12 rounded-full transition-all ${
                          isActive ? "bg-primary/10 text-primary shadow-sm" : ""
                        }`}
                      >
                        <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                      </span>
                      <span className="truncate max-w-full leading-none">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}

              {/* Menu "Mais" */}
              <button
                onClick={() => setMenuAberto((v) => !v)}
                onMouseEnter={() => setMenuAberto(true)}
                className={`flex-1 flex flex-col items-center gap-1 py-1 text-[10px] font-semibold transition-colors active:scale-95 ${
                  menuAberto || moreActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex items-center justify-center h-8 w-12 rounded-full transition-all ${
                    menuAberto || moreActive ? "bg-primary/10 text-primary shadow-sm" : ""
                  }`}
                >
                  {menuAberto ? <X className="w-[18px] h-[18px]" /> : <MoreHorizontal className="w-[18px] h-[18px]" />}
                </span>
                <span className="leading-none">Mais</span>
              </button>
            </div>
          </nav>

          {/* Menu "Mais" - Drawer Mobile */}
          {menuAberto && (
            <>
              <div
                className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
                onClick={() => setMenuAberto(false)}
              />
              <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 z-40 bg-card border-t border-border rounded-t-3xl shadow-2xl pb-3 animate-in slide-in-from-bottom duration-200">
                <div className="flex justify-center pt-2.5 pb-1">
                  <span className="h-1 w-10 rounded-full bg-muted-foreground/25" />
                </div>
                <div className="px-5 pb-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mais opções</p>
                </div>
                <div className="grid grid-cols-3 gap-2 p-3">
                  {moreList.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex flex-col items-center gap-2 py-4 px-2 rounded-2xl text-xs font-semibold transition-all active:scale-95 ${
                          isActive
                            ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                            : "bg-muted text-muted-foreground hover:bg-primary/5 hover:text-primary"
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}