import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();
const MASTER_USER_ID = "6a72071af600bb866f6561f8";
const MASTER_EMAIL = "nailton.alsampaio@gmail.com";

function normalizeUser(currentUser) {
  const isMaster = currentUser?.id === MASTER_USER_ID || currentUser?.email?.trim().toLowerCase() === MASTER_EMAIL;
  const data = currentUser?.data || {};

  return {
    ...currentUser,
    role: isMaster ? "admin" : (data.role || currentUser?.role),
    approval_status: isMaster ? "approved" : (data.approval_status || currentUser?.approval_status),
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);
    await checkUserAuth();
    setIsLoadingPublicSettings(false);
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      // Sem token salvo não há sessão — evita chamada desnecessária que trava a tela
      if (!localStorage.getItem("base44_access_token")) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }
      // Evita tela branca caso a chamada nunca responda
      const currentUser = await Promise.race([
        base44.auth.me(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
      ]);
      setUser(normalizeUser(currentUser));
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      // Token inválido/expirado: limpa para permitir novo login
      const status = error?.status || error?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("base44_access_token");
        localStorage.removeItem("token");
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};