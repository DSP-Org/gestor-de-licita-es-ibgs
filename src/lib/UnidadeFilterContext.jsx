import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toArray } from "@/lib/toArray";

const UnidadeFilterContext = createContext();

export function UnidadeFilterProvider({ children }) {
  const [filtroUnidade, setFiltroUnidade] = useState("todos");
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [unidades, setUnidades] = useState([]);
  // Unidades que o usuário logado (não-master) tem permissão de usar como ativa.
  const [unidadesPermitidas, setUnidadesPermitidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trocandoUnidade, setTrocandoUnidade] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUsuarioLogado(u);
      const isMaster = u?.email === "nailton.alsampaio@gmail.com";
      setIsAdmin(isMaster);

      if (isMaster) {
        // Master: começa com "todos", pode selecionar qualquer unidade
        setFiltroUnidade("todos");
        base44.entities.UnidadeNegocio.list()
          .then((res) => setUnidades(toArray(res).filter((un) => un && un.id)))
          .catch((err) => {
            console.error("Erro ao carregar unidades de negócio:", err);
            setUnidades([]);
          });
      } else {
        // Usuário normal: sempre filtrado para a própria unidade ATIVA (OBRIGATÓRIO)
        setFiltroUnidade(u?.unidade_negocio_id);
        const permitidas = Array.isArray(u?.unidades_negocio_ids) ? u.unidades_negocio_ids : [];
        if (permitidas.length > 0) {
          base44.entities.UnidadeNegocio.filter({ id: { $in: permitidas } })
            .then((res) => setUnidadesPermitidas(toArray(res).filter((un) => un && un.id)))
            .catch((err) => {
              console.error("Erro ao carregar unidades permitidas:", err);
              setUnidadesPermitidas([]);
            });
        }
      }
      setLoading(false);
    }).catch((err) => {
      console.error("Erro ao carregar usuário:", err);
      setLoading(false);
    });
  }, []);

  // Só vale para usuário comum: troca a unidade ativa de verdade (persiste no
  // backend via função que valida se ele pertence à unidade pedida). O
  // seletor do master não passa por aqui — para ele filtroUnidade é só um
  // recorte de visualização local, não altera nada no próprio cadastro.
  const trocarUnidadeAtiva = async (novaUnidadeId) => {
    setTrocandoUnidade(true);
    try {
      const res = await base44.functions.invoke("trocarUnidadeAtiva", { unidadeId: novaUnidadeId });
      if (res.data?.error) throw new Error(res.data.error);
      setFiltroUnidade(novaUnidadeId);
      setUsuarioLogado((atual) => atual ? { ...atual, unidade_negocio_id: novaUnidadeId } : atual);
    } finally {
      setTrocandoUnidade(false);
    }
  };

  const value = {
    filtroUnidade,
    setFiltroUnidade,
    isAdmin,
    usuarioLogado,
    unidades,
    unidadesPermitidas,
    trocarUnidadeAtiva,
    trocandoUnidade,
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
