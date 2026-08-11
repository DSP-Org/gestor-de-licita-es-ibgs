import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Bell, Users, Settings, BellRing, RefreshCw, MoreHorizontal, Mail, X, Sparkles, Sliders, Home, MessageSquare, Heart, HelpCircle, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNotificacoesNativas } from "@/hooks/useNotificacoesNativas";
import { useUserFilter } from "@/lib/UserFilterContext";
import InstalarAppPrompt from "@/components/InstalarAppPrompt";

const mainItems = [
  { to: "/", label: "Licitações", icon: RefreshCw, end: true },
  { to: "/assistente", label: "Assistente", icon: Sparkles },
];
const moreItems = [
  { to: "/busca-avancada", label: "Busca Avançada", icon: Sliders },
  { to: "/buscas", label: "Configuração", icon: Settings },
  { to: "/destinatarios", label: "Destinatários", icon: Mail },
];
const adminItems = [{ to: "/admin", label: "Administrador", icon: Users }];
const footerItems = [
  { to: "#", label: "Sugestões", icon: MessageSquare },
  { to: "#", label: "Favoritos", icon: Heart },
  { to: "#", label: "Ajuda", icon: HelpCircle },
];

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
  const [sidebarFixado, setSidebarFixado] = useState(false);
  const { permissao, solicitarPermissao } = useNotificacoesNativas();
  const location = useLocation();
  const { isAdmin, filtroUsuario, setFiltroUsuario, usuarios, usuarioLogado } = useUserFilter();

  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  const allItems = isAdmin ? [...mainItems, ...moreItems, ...adminItems] : [...mainItems, ...moreItems];
  const moreList = isAdmin ? [...moreItems, ...adminItems] : moreItems;
  const moreActive = moreList.some((item) => location.pathname.startsWith(item.to));

  const userInitials = getInitials(usuarioLogado?.full_name || usuarioLogado?.email);

  return (
    <div className="min-h-screen flex bg-[#F5F7FA]">
      <InstalarAppPrompt />
      {/* Sidebar - Navy Blue com Ícones */}
      <aside className="hidden md:flex w-20 flex-col bg-[#0A1E3F] sticky top-0 h-screen border-r border-[#1a2d52] shadow-lg">
        {/* Avatar do Usuário - Topo */}
        <div className="flex items-center justify-center py-4">
          <div className="w-12 h-12 rounded-full bg-[#0066FF] flex items-center justify-center text-white font-bold text-sm ring-2 ring-[#1a2d52]">
            {userInitials}
          </div>
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 flex flex-col items-center gap-2 py-4 px-2">
          {allItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `w-12 h-12 flex items-center justify-center rounded-full transition-all ${
                  isActive
                    ? "bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/30"
                    : "text-[#7a8fa3] hover:text-white hover:bg-[#1a2d52]"
                }`
              }
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </NavLink>
          ))}
        </nav>

        {/* Menu Inferior */}
        <div className="flex flex-col items-center gap-2 py-4 px-2 border-t border-[#1a2d52]">
          {footerItems.map((item) => (
            <button
              key={item.to}
              className="w-12 h-12 flex items-center justify-center rounded-full text-[#7a8fa3] hover:text-white hover:bg-[#1a2d52] transition-all"
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* Usuário na Base */}
        <div className="flex items-center justify-center pb-4 pt-2 border-t border-[#1a2d52]">
          <div className="w-10 h-10 rounded-full bg-[#0066FF] flex items-center justify-center text-white font-bold text-xs">
            {userInitials}
          </div>
        </div>
      </aside>

      {/* Painel Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Mobile */}
        <header className="md:hidden h-16 flex items-center gap-3 px-4 sticky top-0 z-20 bg-[#0A1E3F] text-white shadow-md">
          <div className="w-9 h-9 rounded-full bg-[#0066FF] flex items-center justify-center shrink-0 font-bold text-xs">
            {userInitials}
          </div>
          <div className="min-w-0 leading-tight flex-1">
            <p className="font-bold text-sm truncate">Licitalerta360</p>
          </div>
          {permissao !== "granted" && permissao !== "unsupported" && (
            <button
              onClick={solicitarPermissao}
              title="Ativar notificações"
              className="p-2 rounded-lg hover:bg-[#1a2d52] transition-colors"
            >
              <BellRing className="w-5 h-5" />
            </button>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Bottom Navigation - Mobile */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-white/95 backdrop-blur-xl shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-stretch px-1 pt-1.5 pb-1">
            {mainItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-1 text-[10px] font-semibold transition-colors active:scale-95 ${
                    isActive ? "text-[#0066FF]" : "text-[#7a8fa3]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex items-center justify-center h-8 w-12 rounded-full transition-all ${
                        isActive ? "bg-[#E8F0FF] text-[#0066FF] shadow-sm" : ""
                      }`}
                    >
                      <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                    </span>
                    <span className="truncate max-w-full leading-none">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}

            {/* Menu "Mais" */}
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className={`flex-1 flex flex-col items-center gap-1 py-1 text-[10px] font-semibold transition-colors active:scale-95 ${
                menuAberto || moreActive ? "text-[#0066FF]" : "text-[#7a8fa3]"
              }`}
            >
              <span
                className={`flex items-center justify-center h-8 w-12 rounded-full transition-all ${
                  menuAberto || moreActive ? "bg-[#E8F0FF] text-[#0066FF] shadow-sm" : ""
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
            <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 z-40 bg-white border-t rounded-t-3xl shadow-2xl pb-3 animate-in slide-in-from-bottom duration-200">
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="h-1 w-10 rounded-full bg-[#7a8fa3]/25" />
              </div>
              <div className="px-5 pb-1">
                <p className="text-[11px] font-semibold text-[#7a8fa3] uppercase tracking-wider">Mais opções</p>
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
                          ? "bg-[#E8F0FF] text-[#0066FF] ring-1 ring-[#0066FF]/20"
                          : "bg-[#F5F7FA] text-[#7a8fa3] hover:bg-[#E8F0FF]"
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