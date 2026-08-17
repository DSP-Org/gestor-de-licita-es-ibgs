import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const UnidadeFilterContext = createContext();

export function UnidadeFilterProvider({ children }) {
  const [filtroUnidade, setFiltroUnidade] = useState("todos");
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUsuarioLogado(u);
      const isMaster = u?.email === "nailton.alsampaio@gmail.com";
      setIsAdmin(isMaster);

      if (isMaster) {
        // Master: começa com "todos", pode selecionar qualquer unidade
        setFiltroUnidade("todos");
        base44.entities.UnidadeNegocio.list()
          .then((res) => {
            const lista = Array.isArray(res) ? res : (res ? [res] : []);
            const unidadesValidas = lista.filter(un => un && un.id);
            setUnidades(unidadesValidas);
          })
          .catch((err) => {
            console.error("Erro ao carregar unidades de negócio:", err);
            setUnidades([]);
          });
      } else {
        // Usuário normal: sempre filtrado para a própria unidade (OBRIGATÓRIO)
        setFiltroUnidade(u?.unidade_negocio_id);
        setUnidades([]);
      }
      setLoading(false);
    }).catch((err) => {
      console.error("Erro ao carregar usuário:", err);
      setLoading(false);
    });
  }, []);

  const value = {
    filtroUnidade,
    setFiltroUnidade,
    isAdmin,
    usuarioLogado,
    unidades,
    loading,
  };

  return (
    <UnidadeFilterContext.Provider value={value}>
      {children}
    </UnidadeFilterContext.Provider>
  );
}

export function useUnidadeFilter() {
  const context = useContext(UnidadeFilterContext);
  if (!context) {
    throw new Error("useUnidadeFilter deve ser usado dentro de UnidadeFilterProvider");
  }
  return context;
}
