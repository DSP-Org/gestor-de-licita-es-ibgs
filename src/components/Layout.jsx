import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Users, Settings, BellRing, RefreshCw, MoreHorizontal, X, Sparkles, Sliders, Bookmark } from "lucide-react";
import { useNotificacoesNativas } from "@/hooks/useNotificacoesNativas";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";
import InstalarAppPrompt from "@/components/InstalarAppPrompt";
import { toast } from "@/components/ui/use-toast";

const mainItems = [
  { to: "/", label: "Licitações", icon: RefreshCw, end: true },
  { to: "/minhas-licitacoes", label: "Minhas Licitações", icon: Bookmark },
  { to: "/assistente", label: "Assistente", icon: Sparkles },
];
const moreItems = [
  { to: "/busca-avancada", label: "Radar", icon: Sliders },
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
  const [sidebarFixado, setSidebarFixado] = useState(false);
  const [sidebarExpandido, setSidebarExpandido] = useState(false);
  const { permissao, solicitarPermissao } = useNotificacoesNativas();
  const location = useLocation();
  const { isAdmin, filtroUnidade, unidades, unidadesPermitidas, trocarUnidadeAtiva, usuarioLogado } = useUnidadeFilter();

  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  const allItems = isAdmin ? [...mainItems, ...moreItems, ...adminItems] : [...mainItems, ...moreItems];
  const moreList = isAdmin ? [...moreItems, ...adminItems] : moreItems;
  const moreActive = moreList.some((item) => location.pathname.startsWith(item.to));

  const userInitials = getInitials(usuarioLogado?.full_name || usuarioLogado?.email);

  // Sem isso, uma troca rejeitada pelo backend (ex: sem permissão) falhava em
  // silêncio — só um erro no console, nada visível pro usuário.
  const handleTrocarUnidade = (novaUnidadeId) => {
    trocarUnidadeAtiva(novaUnidadeId).catch((err) => {
      toast({
        title: "Não foi possível trocar de unidade",
        description: err.message,
        variant: "destructive",
      });
    });
  };

  // Cada unidade é uma empresa diferente — trocar a unidade ativa vale pra
  // tudo (todas as páginas e filtros), pro admin igual pra qualquer usuário.
  // Admin escolhe entre todas as unidades cadastradas; usuário comum só entre
  // as que tem permissão. Com uma unidade só, não faz sentido oferecer uma
  // troca que não existe, então mostra o nome como texto fixo em vez de dropdown.
  const mostrarSeletorUnidade = isAdmin || unidadesPermitidas.length >= 1;
  const unidadeUnicaSemEscolha = !isAdmin && unidadesPermitidas.length === 1;
  const opcoesSeletorUnidade = isAdmin ? unidades : unidadesPermitidas;

  return (
    <>
      <InstalarAppPrompt />
      <div className="min-h-screen flex bg-[#F5F7FA]">
        {/* Sidebar - Navy Blue com Ícones */}
        <aside
          className="hidden md:flex flex-col sticky top-0 h-screen shadow-lg transition-all duration-300"
          style={{
            backgroundColor: "#0A1E3F",
            borderColor: "#1a2d52",
            width: sidebarExpandido ? "240px" : "80px"
          }}
          onMouseEnter={() => setSidebarExpandido(true)}
          onMouseLeave={() => setSidebarExpandido(false)}
        >
        {/* Avatar do Usuário - Topo */}
        <div className="flex items-center justify-center py-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2" style={{ backgroundColor: "#0066FF", borderColor: "#1a2d52" }}>
            {userInitials}
          </div>
        </div>

        {/* Seletor de unidade de negócio */}
        {mostrarSeletorUnidade && sidebarExpandido && (
          <div className="px-3 pb-3">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#7a8fa3" }}>
              Unidade ativa
            </label>
            {unidadeUnicaSemEscolha ? (
              <p className="w-full px-2 py-1.5 text-xs rounded-lg border truncate" style={{ backgroundColor: "#1a2d52", borderColor: "#2a3d62", color: "white" }}>
                {unidadesPermitidas[0]?.nome}
              </p>
            ) : (
              <select
                value={filtroUnidade || ""}
                onChange={(e) => handleTrocarUnidade(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                style={{ backgroundColor: "#1a2d52", borderColor: "#2a3d62", color: "white" }}
              >
                {!filtroUnidade && <option value="">Selecione uma unidade</option>}
                {opcoesSeletorUnidade.map((un) => (
                  <option key={un.id} value={un.id}>
                    {un.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Navegação Principal */}
        <nav className="flex-1 flex flex-col items-center gap-2 py-4 px-2">
          {allItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `h-12 flex items-center justify-center rounded-full transition-all gap-3 ${
                  sidebarExpandido ? "w-full px-4" : "w-12"
                } ${
                  isActive
                    ? "text-white"
                    : "hover:text-white"
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? "#0066FF" : "transparent",
                color: isActive ? "white" : "#7a8fa3",
                boxShadow: isActive ? "0 10px 25px -5px rgba(0, 102, 255, 0.3)" : "none"
              })}
              title={item.label}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarExpandido && <span className="text-sm font-medium truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Menu Inferior */}
        <div className="flex flex-col items-center gap-2 py-4 px-2" style={{ borderColor: "#1a2d52" }}>
          {footerItems.map((item) => (
            <button
              key={item.to}
              className={`h-12 flex items-center justify-center rounded-full transition-all hover:text-white gap-3 ${
                sidebarExpandido ? "w-full px-4" : "w-12"
              }`}
              style={{ color: "#7a8fa3", backgroundColor: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a2d52")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              title={item.label}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarExpandido && <span className="text-sm font-medium truncate">{item.label}</span>}
            </button>
          ))}
        </div>

        {/* Usuário na Base */}
        <div className="flex items-center justify-center pb-4 pt-2" style={{ borderColor: "#1a2d52" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: "#0066FF" }}>
            {userInitials}
          </div>
        </div>
      </aside>

      {/* Painel Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Mobile */}
        <header className="md:hidden h-16 flex items-center gap-3 px-4 sticky top-0 z-20 text-white shadow-md" style={{ backgroundColor: "#0A1E3F" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs text-white" style={{ backgroundColor: "#0066FF" }}>
            {userInitials}
          </div>
          <div className="min-w-0 leading-tight flex-1">
            <p className="font-bold text-sm truncate">Licitalerta360</p>
            {mostrarSeletorUnidade && (
              unidadeUnicaSemEscolha ? (
                <p className="mt-0.5 max-w-full px-1.5 py-0.5 text-[11px] rounded border truncate" style={{ backgroundColor: "#1a2d52", borderColor: "#2a3d62", color: "white" }}>
                  {unidadesPermitidas[0]?.nome}
                </p>
              ) : (
                <select
                  value={filtroUnidade || ""}
                  onChange={(e) => handleTrocarUnidade(e.target.value)}
                  className="mt-0.5 max-w-full px-1.5 py-0.5 text-[11px] rounded border focus:outline-none"
                  style={{ backgroundColor: "#1a2d52", borderColor: "#2a3d62", color: "white" }}
                >
                  {!filtroUnidade && <option value="">Selecione uma unidade</option>}
                  {opcoesSeletorUnidade.map((un) => (
                    <option key={un.id} value={un.id}>
                      {un.nome}
                    </option>
                  ))}
                </select>
              )
            )}
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
              onMouseEnter={() => setMenuAberto(true)}
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
    </>
  );
}