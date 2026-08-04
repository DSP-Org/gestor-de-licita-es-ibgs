import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { FileText, Search, Bookmark, Bell, Users, Settings, BellRing } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNotificacoesNativas } from "@/hooks/useNotificacoesNativas";

const navItems = [
  { to: "/", label: "Início", icon: FileText, end: true },
  { to: "/explorar", label: "Explorar", icon: Search },
  { to: "/buscas", label: "Buscas", icon: Bookmark },
  { to: "/configuracoes", label: "Config", icon: Settings },
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
    <div className="min-h-screen flex bg-muted/30">
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar">
        <div className="h-16 flex items-center gap-2 px-6 border-b">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
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
        <header className="md:hidden h-14 flex items-center gap-2 px-3 border-b bg-sidebar sticky top-0 z-10">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold text-sm truncate">Alerta Licitação</span>
          {permissao !== "granted" && permissao !== "unsupported" && (
            <button
              onClick={solicitarPermissao}
              title="Ativar notificações no celular"
              className="p-1.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent shrink-0"
            >
              <BellRing className="w-4 h-4" />
            </button>
          )}
          <nav className="ml-auto flex gap-0.5 overflow-x-auto no-scrollbar">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `p-2 rounded-lg shrink-0 ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"}`
                }
              >
                <item.icon className="w-5 h-5" />
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}