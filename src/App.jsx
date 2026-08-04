import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from "@/components/Layout";
import MinhasLicitacoes from "@/pages/MinhasLicitacoes";
import Explorar from "@/pages/Explorar";
import BuscasEAutomacao from "@/pages/BuscasEAutomacao";
import Atualizacao from "@/pages/Atualizacao";
import Usuarios from "@/pages/Usuarios";
import LicitacaoDetalhe from "@/pages/LicitacaoDetalhe";
import ResultadoCompartilhado from "@/pages/ResultadoCompartilhado";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const location = useLocation();

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

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Require authentication for all non-public routes
  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route element={<Layout />}>
        <Route path="/" element={<MinhasLicitacoes />} />
        <Route path="/atualizacao" element={<Atualizacao />} />
        <Route path="/explorar" element={<Explorar />} />
        <Route path="/buscas" element={<BuscasEAutomacao />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/licitacao/:idLicitacao" element={<LicitacaoDetalhe />} />
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
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App