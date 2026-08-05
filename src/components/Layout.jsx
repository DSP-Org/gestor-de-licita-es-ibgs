import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { FileText, Search, Bell, Users, Settings, BellRing, RefreshCw, BookOpen, MoreHorizontal, Mail, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNotificacoesNativas } from "@/hooks/useNotificacoesNativas";
import InstalarAppPrompt from "@/components/InstalarAppPrompt";

const navItems = [
  { to: "/atualizacao", label: "Atualização", icon: RefreshCw },
  { to: "/", label: "Minhas", icon: FileText, end: true },
  { to: "/explorar", label: "Explorar", icon: Search },
];
const moreItems = [
  { to: "/buscas", label: "Buscas", icon: Settings },
  { to: "/destinatarios", label: "Destinatários", icon: Mail },
  { to: "/instrucoes", label: "Ajuda", icon: BookOpen },
];
const adminItems = [{ to: "/admin", label: "Administrador", icon: Users }];

export default function Layout() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const { permissao, solicitarPermissao } = useNotificacoesNativas();
  const location = useLocation();

  useEffect(() => {
    base44.auth.me()
      .then((u) => setIsAdmin(u?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  // Fecha o menu ao navegar
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  const allItems = isAdmin ? [...navItems, ...moreItems, ...adminItems] : [...navItems, ...moreItems];
  const moreList = isAdmin ? [...moreItems, ...adminItems] : moreItems;

  // Verifica se alguma rota do menu "Mais" está ativa
  const moreActive = moreList.some((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
  );

  return (
    <div className="min-h-screen flex bg-background">
      <InstalarAppPrompt />
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30">
            <Bell className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-semibold leading-tight truncate">Licitalerta360</p>
            <p className="text-xs text-muted-foreground">Gestão de licitações</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {allItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t text-xs text-muted-foreground space-y-0.5">
          <p>Fonte: alertalicitacao.com.br</p>
          <p className="font-medium text-foreground/70">Desenvolvido por Data5 Tecnologia</p>
          <p>Todos os direitos reservados © {new Date().getFullYear()}</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-16 flex items-center gap-3 px-4 sticky top-0 z-20 bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground shadow-md shadow-primary/20">
          <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/30">
            <Bell className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-heading font-bold text-[15px] truncate">Licitalerta360</p>
            <p className="text-[10px] text-white/75">Gestão de licitações</p>
          </div>
          {permissao !== "granted" && permissao !== "unsupported" && (
            <button
              onClick={solicitarPermissao}
              title="Ativar notificações no celular"
              className="ml-auto p-2 rounded-xl bg-white/15 text-white hover:bg-white/25 shrink-0 transition-colors"
            >
              <BellRing className="w-5 h-5" />
            </button>
          )}
        </header>

        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Barra de navegação inferior — celular */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/90 backdrop-blur-xl shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-stretch px-1 pt-1.5 pb-1">
            {navItems.map((item) => (
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
                        isActive ? "bg-accent text-primary shadow-sm" : ""
                      }`}
                    >
                      <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                    </span>
                    <span className="truncate max-w-full leading-none">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}

            {/* Botão "Mais" */}
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className={`flex-1 flex flex-col items-center gap-1 py-1 text-[10px] font-semibold transition-colors active:scale-95 ${
                menuAberto || moreActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex items-center justify-center h-8 w-12 rounded-full transition-all ${
                  menuAberto || moreActive ? "bg-accent text-primary shadow-sm" : ""
                }`}
              >
                {menuAberto ? <X className="w-[18px] h-[18px]" /> : <MoreHorizontal className="w-[18px] h-[18px]" />}
              </span>
              <span className="leading-none">{menuAberto ? "Fechar" : "Mais"}</span>
            </button>
          </div>
        </nav>

        {/* Menu "Mais" — drawer superior a partir da barra inferior */}
        {menuAberto && (
          <>
            <div
              className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
              onClick={() => setMenuAberto(false)}
            />
            <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 z-40 bg-card border-t rounded-t-3xl shadow-2xl pb-3 animate-in slide-in-from-bottom duration-200">
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
                          ? "bg-accent text-primary ring-1 ring-primary/20"
                          : "bg-muted/50 text-foreground/70 hover:bg-muted"
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
  );
}