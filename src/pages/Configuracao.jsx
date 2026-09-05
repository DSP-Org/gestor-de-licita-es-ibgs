import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUnidadeFilter } from "@/lib/UnidadeFilterContext";
import { escopoUnidade, unidadeEfetiva } from "@/lib/escopoUnidade";
import { Plus, RefreshCw, Loader2, Bell, Users, Mail } from "lucide-react";
import BuscaForm from "@/components/buscas/BuscaForm";
import SeletorDestinatarios from "@/components/buscas/SeletorDestinatarios";
import DestinatarioForm from "@/components/destinatarios/DestinatarioForm";
import EmailResultsDialog from "@/components/licitacoes/EmailResultsDialog";
import AlertCard from "@/components/buscas/AlertCard";
import { toArray } from "@/lib/toArray";

export default function Configuracao() {
  const [buscas, setBuscas] = useState([]);
  const [loadingBuscas, setLoadingBuscas] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [sincronizando, setSincronizando] = useState(null);
  const [resultadoSync, setResultadoSync] = useState({});
  const [emailBusca, setEmailBusca] = useState(null);
  const [emailLics, setEmailLics] = useState([]);

  const [destinatarios, setDestinatarios] = useState([]);
  const [loadingDestinatarios, setLoadingDestinatarios] = useState(true);
  const [abaDestinatarios, setAbaDestinatarios] = useState(false);
  const [buscaDestinatarios, setBuscaDestinatarios] = useState(null);

  const { isAdmin, filtroUnidade, usuarioLogado } = useUnidadeFilter();

  const carregarBuscas = async () => {
    setLoadingBuscas(true);
    try {
      const lista = await base44.entities.BuscaSalva.filter(
        escopoUnidade(isAdmin, filtroUnidade),
        "-updated_date",
        100,
      );
      setBuscas(toArray(lista));
    } finally {
      setLoadingBuscas(false);
    }
  };

  const carregarDestinatarios = async () => {
    setLoadingDestinatarios(true);
    try {
      const res = await base44.entities.Destinatario.filter(
        escopoUnidade(isAdmin, filtroUnidade),
        "-created_date",
        200,
      );
      setDestinatarios(toArray(res));
    } finally {
      setLoadingDestinatarios(false);
    }
  };

  useEffect(() => {
    if (usuarioLogado) {
      carregarBuscas();
      carregarDestinatarios();
    }
  }, [filtroUnidade, isAdmin, usuarioLogado]);

  const salvarBusca = async (form) => {
    const unidadeId = unidadeEfetiva(isAdmin, filtroUnidade, usuarioLogado);
    if (!unidadeId) {
      throw new Error("Selecione uma unidade de negócio ativa no cabeçalho antes de salvar a busca.");
    }
    const dados = { ...form, unidade_negocio_id: unidadeId };
    if (editando?.id) {
      await base44.entities.BuscaSalva.update(editando.id, dados);
    } else {
      await base44.entities.BuscaSalva.create(dados);
    }
    setMostrarForm(false);
    setEditando(null);
    await carregarBuscas();
  };

  const removerBusca = async (busca) => {
    if (!confirm(`Excluir o alerta "${busca.nome}"?`)) return;
    await base44.entities.BuscaSalva.delete(busca.id);
    carregarBuscas();
  };

  const toggleAtiva = async (busca) => {
    const novoValor = !busca.ativa;
    setBuscas((lista) => lista.map((x) => (x.id === busca.id ? { ...x, ativa: novoValor } : x)));
    try {
      await base44.entities.BuscaSalva.update(busca.id, { ativa: novoValor });
    } catch {
      setBuscas((lista) => lista.map((x) => (x.id === busca.id ? { ...x, ativa: !novoValor } : x)));
    }
  };

  const sincronizar = async (busca) => {
    setSincronizando(busca.id);
    setResultadoSync((r) => ({ ...r, [busca.id]: null }));
    try {
      const res = await base44.functions.invoke("sincronizarBuscas", {
        buscaIds: [busca.id],
        force: true,
      });
      if (res.data?.error) throw new Error(res.data.error);
      const item = toArray(res.data?.resumo)[0];
      if (item?.erro) {
        setResultadoSync((r) => ({ ...r, [busca.id]: { erro: item.erro } }));
        return;
      }
      setResultadoSync((r) => ({
        ...r,
        [busca.id]: { novas: item?.novas ?? 0, total: item?.total ?? 0 },
      }));
      carregarBuscas();
    } catch (e) {
      setResultadoSync((r) => ({ ...r, [busca.id]: { erro: e.message } }));
    } finally {
      setSincronizando(null);
    }
  };

  const salvarDestinatario = async (dados) => {
    await base44.entities.Destinatario.create({
      ...dados,
      unidade_negocio_id: unidadeEfetiva(isAdmin, filtroUnidade, usuarioLogado),
    });
    carregarDestinatarios();
  };

  const removerDestinatario = async (item) => {
    if (!window.confirm(`Excluir ${item.email} da lista de destinatários?`)) return;
    await base44.entities.Destinatario.delete(item.id);
    setDestinatarios((prev) => prev.filter((d) => d.id !== item.id));
  };

  const sincronizarTodas = async () => {
    const ativas = buscas.filter((b) => b.ativa);
    if (ativas.length === 0) return;
    setSincronizando("todas");
    try {
      const res = await base44.functions.invoke("sincronizarBuscas", {
        buscaIds: ativas.map((b) => b.id),
        force: true,
      });
      for (const item of toArray(res.data?.resumo)) {
        if (item?.erro) {
          setResultadoSync((r) => ({ ...r, [item.busca_id]: { erro: item.erro } }));
        } else {
          setResultadoSync((r) => ({
            ...r,
            [item.busca_id]: { novas: item?.novas ?? 0, total: item?.total ?? 0 },
          }));
        }
      }
      carregarBuscas();
    } catch (e) {
      console.error(e);
    } finally {
      setSincronizando(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ===== HERO ===== */}
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-700 mb-2">
            Prospecção no piloto automático
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-slate-800 leading-tight mb-2">
            Seus alertas.
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Defina o que importa para o seu time e deixe o radar avisar quando houver movimento.
          </p>
        </div>

        {/* ===== AÇÕES ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setEditando(null); setMostrarForm(true); }}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo alerta
            </button>
            <button
              onClick={sincronizarTodas}
              disabled={sincronizando === "todas" || buscas.filter((b) => b.ativa).length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {sincronizando === "todas" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Sincronizar todas</>
              )}
            </button>
          </div>

          <button
            onClick={() => setAbaDestinatarios(!abaDestinatarios)}
            className={`inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
              abaDestinatarios
                ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                : "text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" /> Destinatários
            {destinatarios.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">
                {destinatarios.length}
              </span>
            )}
          </button>
        </div>

        {/* ===== FORM NOVO ALERTA ===== */}
        {mostrarForm && (
          <BuscaForm
            initial={editando}
            onSave={salvarBusca}
            onCancel={() => { setMostrarForm(false); setEditando(null); }}
          />
        )}

        {/* ===== ABA DESTINATÁRIOS ===== */}
        {abaDestinatarios && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Destinatários</h3>
                <p className="text-xs text-slate-500 mt-0.5">Lista de e-mails usada nas notificações de alertas.</p>
              </div>
            </div>
            <DestinatarioForm onSave={salvarDestinatario} />
            {loadingDestinatarios ? (
              <p className="text-center py-8 text-slate-400 text-sm">Carregando...</p>
            ) : destinatarios.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">Nenhum destinatário cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {destinatarios.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {d.nome && <p className="text-sm font-medium text-slate-700 truncate">{d.nome}</p>}
                      <p className="text-xs text-slate-400 truncate">{d.email}</p>
                    </div>
                    <button
                      onClick={() => removerDestinatario(d)}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== GRID DE ALERTAS ===== */}
        {loadingBuscas ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-sm">Carregando alertas...</p>
          </div>
        ) : buscas.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-slate-800 mb-1">Nenhum alerta configurado</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Crie seu primeiro alerta para ser avisado automaticamente quando novas licitações aparecerem.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buscas.map((b) => (
              <div key={b.id} className="flex flex-col gap-3">
                <AlertCard
                  busca={b}
                  onEdit={(busca) => { setEditando(busca); setMostrarForm(true); }}
                  onDelete={removerBusca}
                  onToggleAtiva={toggleAtiva}
                  sincronizando={sincronizando === b.id}
                  resultadoSync={resultadoSync}
                />
                {/* Ações rápidas: sincronizar e destinatários */}
                <div className="flex items-center gap-2 px-1">
                  <button
                    onClick={() => sincronizar(b)}
                    disabled={sincronizando === b.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {sincronizando === b.id ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizando...</>
                    ) : (
                      <><RefreshCw className="w-3.5 h-3.5" /> Sincronizar agora</>
                    )}
                  </button>
                  <button
                    onClick={() => setBuscaDestinatarios(b)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-700 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" /> Notificar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de destinatários da busca */}
      {buscaDestinatarios && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setBuscaDestinatarios(null)}>
          <div className="bg-white w-full min-h-[70vh] sm:min-h-0 sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Notificações — {buscaDestinatarios.nome}</h3>
              <button onClick={() => setBuscaDestinatarios(null)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>
            <SeletorDestinatarios
              busca={buscaDestinatarios}
              contatos={destinatarios}
              carregando={loadingDestinatarios}
              onUpdated={(id, campo, valor) =>
                setBuscas((lista) => lista.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)))
              }
            />
          </div>
        </div>
      )}

      {emailBusca && (
        <EmailResultsDialog
          licitacoes={emailLics}
          origem={emailBusca.nome}
          onClose={() => { setEmailBusca(null); setEmailLics([]); }}
        />
      )}
    </div>
  );
}