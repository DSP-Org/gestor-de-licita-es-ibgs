import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toArray } from "@/lib/toArray";

const UnidadeFilterContext = createContext();

export function UnidadeFilterProvider({ children }) {
  const [filtroUnidade, setFiltroUnidade] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  // Todas as unidades cadastradas — só carregado/usado para admin escolher entre elas.
  const [unidades, setUnidades] = useState([]);
  // Unidades que o usuário logado (não-admin) tem permissão de usar como ativa.
  const [unidadesPermitidas, setUnidadesPermitidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trocandoUnidade, setTrocandoUnidade] = useState(false);

  // Recarrega a lista de unidades usada pelo seletor do Layout. Extraído do
  // useEffect de mount para poder ser chamado de novo por quem cria/edita/exclui
  // uma unidade em outra tela (Usuarios.jsx) — sem isso o seletor ficava com
  // dados velhos (ex: unidade excluída continuando a aparecer) até recarregar a página.
  const recarregarUnidades = async (usuarioAtual) => {
    const u = usuarioAtual ?? usuarioLogado;
    const isAdminUser = u?.role === "admin";
    if (isAdminUser) {
      try {
        const res = await base44.entities.UnidadeNegocio.list();
        setUnidades(toArray(res).filter((un) => un && un.id));
      } catch (err) {
        console.error("Erro ao carregar unidades de negócio:", err);
        setUnidades([]);
      }
    } else {
      const permitidas = Array.isArray(u?.unidades_negocio_ids) ? u.unidades_negocio_ids : [];
      if (permitidas.length === 0) {
        setUnidadesPermitidas([]);
        return;
      }
      try {
        const res = await base44.entities.UnidadeNegocio.filter({ id: { $in: permitidas } });
        setUnidadesPermitidas(toArray(res).filter((un) => un && un.id));
      } catch (err) {
        console.error("Erro ao carregar unidades permitidas:", err);
        setUnidadesPermitidas([]);
      }
    }
  };

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUsuarioLogado(u);
      setIsAdmin(u?.role === "admin");

      // Todo usuário, inclusive admin, sempre filtrado para a própria unidade
      // ATIVA — não existe mais visão combinada de "todas as unidades".
      setFiltroUnidade(u?.unidade_negocio_id);
      await recarregarUnidades(u);
      setLoading(false);
    }).catch((err) => {
      console.error("Erro ao carregar usuário:", err);
      setLoading(false);
    });
  }, []);

  // Único caminho pra trocar a unidade ativa (inclusive admin): persiste no
  // backend via função que valida se o usuário pode acessar a unidade pedida.
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
    recarregarUnidades,
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
