import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const UserFilterContext = createContext();

export function UserFilterProvider({ children }) {
  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUsuarioLogado(u);
      const isMaster = u?.email === "nailton.alsampaio@gmail.com";
      setIsAdmin(isMaster);

      if (isMaster) {
        // Master: começa com "todos", pode selecionar qualquer um
        setFiltroUsuario("todos");
        base44.entities.User.list().then((res) => {
          const lista = Array.isArray(res) ? res : [res];
          setUsuarios(lista.filter(u => u && u.id));
        });
      } else {
        // Usuário normal: sempre filtrado para si mesmo (OBRIGATÓRIO)
        setFiltroUsuario(u?.id);
        setUsuarios([]);
      }
      setLoading(false);
    });
  }, []);

  const value = {
    filtroUsuario,
    setFiltroUsuario,
    isAdmin,
    usuarioLogado,
    usuarios,
    loading,
  };

  return (
    <UserFilterContext.Provider value={value}>
      {children}
    </UserFilterContext.Provider>
  );
}

export function useUserFilter() {
  const context = useContext(UserFilterContext);
  if (!context) {
    throw new Error("useUserFilter deve ser usado dentro de UserFilterProvider");
  }
  return context;
}
