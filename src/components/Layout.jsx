import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { FileText, Search, Bell, Users, Settings, BellRing, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNotificacoesNativas } from "@/hooks/useNotificacoesNativas";

const navItems = [
  { to: "/", label: "Início", icon: FileText, end: true },
  { to: "/atualizacao", label: "Atualização", icon: RefreshCw },
  { to: "/explorar", label: "Explorar", icon: Search },
  { to: "/buscas", label: "Configuração", icon: Settings },
];
const adminItems = [{ to: "/usuarios", label: "Usuários", icon: Users }];

export default function Layout() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { permissao, solicitarPermissao } = useNotificacoesNativas();

  useEffect(() => {
    base44.auth.me()
      .then((u) => setIsAdmin(u?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  const items = isAdmin ? [...navItems, ...adminItems] : navItems;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30">
            <Bell className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-semibold leading-tight truncate">Alerta Licitação</p>
            <p className="text-xs text-muted-foreground">Gestão de licitações</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((item) => (
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
          <span className="font-heading font-semibold text-sm truncate">Alerta Licitação</span>
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
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-sidebar-foreground/60"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex items-center justify-center w-10 h-7 rounded-lg ${isActive ? "bg-accent" : ""}`}>
                      <item.icon className="w-5 h-5" />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}