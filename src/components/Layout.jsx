import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { FileText, Search, Bookmark, Bell, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { to: "/", label: "Minhas Licitações", icon: FileText, end: true },
  { to: "/explorar", label: "Explorar API", icon: Search },
  { to: "/buscas", label: "Buscas Salvas", icon: Bookmark },
];
const adminItems = [{ to: "/usuarios", label: "Usuários", icon: Users }];

export default function Layout() {
  const [isAdmin, setIsAdmin] = useState(false);

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
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-heading font-semibold leading-tight">Alerta Licitação</p>
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
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t text-xs text-muted-foreground">
          Fonte: alertalicitacao.com.br
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 flex items-center gap-2 px-4 border-b bg-sidebar sticky top-0 z-10">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold">Alerta Licitação</span>
          <nav className="ml-auto flex gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `p-2 rounded-lg ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"}`
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