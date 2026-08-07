import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AppErrorBoundary from '@/components/AppErrorBoundary';
// Add page imports here
import Layout from "@/components/Layout";
import MinhasLicitacoes from "@/pages/MinhasLicitacoes";
import BuscasEAutomacao from "@/pages/BuscasEAutomacao";
import Destinatarios from "@/pages/Destinatarios";
import Administrador from "@/pages/Administrador";
import LicitacaoDetalhe from "@/pages/LicitacaoDetalhe";
import ResultadoCompartilhado from "@/pages/ResultadoCompartilhado";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import LandingPage from "@/pages/LandingPage";
import Assistente from "@/pages/Assistente";
import BancoLicitacoes from "@/pages/BancoLicitacoes";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();
  const location = useLocation();
  const loginRedirect = (
    <Navigate
      to={"/login?returnTo=" + encodeURIComponent(location.pathname + location.search)}
      replace
    />
  );

  // Páginas públicas (compartilhamento por código) — não exigem login
  if (location.pathname.startsWith("/compartilhar/")) {
    return (
      <Routes>
        <Route path="/compartilhar/:codigo" element={<ResultadoCompartilhado />} />
      </Routes>
    );
  }

  // Páginas de autenticação — não exigem login
  if (AUTH_PATHS.includes(location.pathname)) {
    if (isAuthenticated && location.pathname === "/login") {
      return <Navigate to="/" replace />;
    }
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // A página inicial funciona como apresentação pública para visitantes
  if (location.pathname === "/" && !isAuthenticated) {
    return <LandingPage />;
  }

  // Handle authentication errors
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Require authentication for all non-public routes
  if (!isAuthenticated) {
    return loginRedirect;
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route element={<Layout />}>
        <Route path="/" element={<MinhasLicitacoes />} />
        <Route path="/atualizacao" element={<Navigate to="/banco-licitacoes" replace />} />
        <Route path="/explorar" element={<Navigate to="/banco-licitacoes" replace />} />
        <Route path="/buscas" element={<BuscasEAutomacao />} />
        <Route path="/admin" element={<Administrador />} />
        <Route path="/licitacao/:idLicitacao" element={<LicitacaoDetalhe />} />
        <Route path="/destinatarios" element={<Destinatarios />} />
        <Route path="/assistente" element={<Assistente />} />
        <Route path="/banco-licitacoes" element={<BancoLicitacoes />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AppErrorBoundary>
            <AuthenticatedApp />
          </AppErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App