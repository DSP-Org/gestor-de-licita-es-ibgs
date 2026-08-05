import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { FileText, Search, Bell, Users, Settings, BellRing, RefreshCw, BookOpen, MoreHorizontal, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNotificacoesNativas } from "@/hooks/useNotificacoesNativas";

const navItems = [
  { to: "/atualizacao", label: "Atualização", icon: RefreshCw },
  { to: "/", label: "Minhas", icon: FileText, end: true },
  { to: "/explorar", label: "Explorar", icon: Search },
];
const moreItems = [
  { to: "/buscas", label: "Buscas", icon: Settings },
  { to: "/instrucoes", label: "Ajuda", icon: BookOpen },
];
const adminItems = [{ to: "/usuarios", label: "Usuários", icon: Users }];

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
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30">
            <Bell className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-semibold leading-tight truncate">LicitaAlerta</p>
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
        <header className="md:hidden h-14 flex items-center gap-2.5 px-4 border-b bg-sidebar/95 backdrop-blur sticky top-0 z-20">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold text-sm truncate">LicitaAlerta</span>
          {permissao !== "granted" && permissao !== "unsupported" && (
            <button
              onClick={solicitarPermissao}
              title="Ativar notificações no celular"
              className="ml-auto p-2 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent shrink-0"
            >
              <BellRing className="w-5 h-5" />
            </button>
          )}
        </header>

        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Barra de navegação inferior — celular */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t bg-sidebar/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-stretch">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[9px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-sidebar-foreground/60"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${isActive ? "bg-accent" : ""}`}>
                      <item.icon className="w-4 h-4" />
                    </span>
                    <span className="truncate max-w-full leading-tight">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}

            {/* Botão "Mais" */}
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[9px] font-medium transition-colors ${
                menuAberto || moreActive ? "text-primary" : "text-sidebar-foreground/60"
              }`}
            >
              <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${menuAberto || moreActive ? "bg-accent" : ""}`}>
                {menuAberto ? <X className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
              </span>
              <span className="leading-tight">{menuAberto ? "Fechar" : "Mais"}</span>
            </button>
          </div>
        </nav>

        {/* Menu "Mais" — drawer superior a partir da barra inferior */}
        {menuAberto && (
          <>
            <div
              className="md:hidden fixed inset-0 z-30 bg-black/30"
              onClick={() => setMenuAberto(false)}
            />
            <div className="md:hidden fixed bottom-[calc(3.25rem+env(safe-area-inset-bottom))] inset-x-0 z-40 bg-card border-t rounded-t-2xl shadow-lg pb-2 animate-in slide-in-from-bottom duration-200">
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mais opções</p>
              </div>
              <div className="grid grid-cols-3 gap-1 p-2">
                {moreList.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-accent text-primary"
                          : "text-sidebar-foreground/70 hover:bg-muted"
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