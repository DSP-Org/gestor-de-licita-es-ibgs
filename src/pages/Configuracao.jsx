import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { buscarLicitacoes } from "@/shared/alertaApi";
import { useUserFilter } from "@/lib/UserFilterContext";
import { Plus, Pencil, Trash2, RefreshCw, Loader2, Check, Mail, Search, MapPin, Clock, Tag } from "lucide-react";
import BuscaForm from "@/components/buscas/BuscaForm";
import BuscaToggles from "@/components/buscas/BuscaToggles";
import DestinatarioForm from "@/components/destinatarios/DestinatarioForm";
import EmailResultsDialog from "@/components/licitacoes/EmailResultsDialog";
import { toArray } from "@/lib/toArray";

export default function Configuracao() {
  const [aba, setAba] = useState("filtro"); // "filtro" | "destinatarios" | "sincronizacao"

  // Estado de Buscas
  const [buscas, setBuscas] = useState([]);
  const [loadingBuscas, setLoadingBuscas] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [sincronizando, setSincronizando] = useState(null);
  const [resultadoSync, setResultadoSync] = useState({});
  const [emailBusca, setEmailBusca] = useState(null);
  const [emailLics, setEmailLics] = useState([]);
  const [carregandoEmail, setCarregandoEmail] = useState(null);

  // Estado de Destinatários
  const [destinatarios, setDestinatarios] = useState([]);
  const [loadingDestinatarios, setLoadingDestinatarios] = useState(true);

  const { isAdmin, filtroUsuario, usuarioLogado } = useUserFilter();

  // Carregar Buscas
  const carregarBuscas = async () => {
    setLoadingBuscas(true);
    try {
      const filtro = isAdmin && filtroUsuario === "todos"
        ? {}
        : { $or: [{ usuario_id: filtroUsuario }, { created_by_id: filtroUsuario }] };
      const lista = await base44.entities.BuscaSalva.filter(filtro, "-updated_date", 100);
      setBuscas(toArray(lista));
    } finally {
      setLoadingBuscas(false);
    }
  };

  // Carregar Destinatários
  const carregarDestinatarios = async () => {
    setLoadingDestinatarios(true);
    try {
      const res = await base44.entities.Destinatario.list("-created_date", 200);
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
  }, [filtroUsuario, isAdmin, usuarioLogado]);

  const buscasExibidas = useMemo(() => {
    if (!isAdmin || filtroUsuario === "todos") return buscas;
    return buscas.filter((b) => b.created_by_id === filtroUsuario || b.usuario_id === filtroUsuario);
  }, [buscas, isAdmin, filtroUsuario]);

  // Funções de Busca
  const salvarBusca = async (form) => {
    const dados = isAdmin && filtroUsuario !== "todos" ? { ...form, usuario_id: filtroUsuario } : form;
    if (editando?.id) {
      await base44.entities.BuscaSalva.update(editando.id, dados);
    } else {
      await base44.entities.BuscaSalva.create(dados);
    }
    setMostrarForm(false);
    setEditando(null);
    carregarBuscas();
  };

  const enviarEmail = async (busca) => {
    setCarregandoEmail(busca.id);
    try {
      const data = await buscarLicitacoes({
        uf: busca.uf,
        palavra_chave: busca.palavra_chave,
        modalidade: busca.modalidade,
        municipio_ibge: busca.municipio_ibge,
        pagina: 1,
        licitacoesPorPagina: busca.licitacoes_por_pagina || 50,
      });
      setEmailLics(toArray(data.licitacoes));
      setEmailBusca(busca);
    } catch (e) {
      setResultadoSync((r) => ({ ...r, [busca.id]: { erro: e.message } }));
    } finally {
      setCarregandoEmail(null);
    }
  };

  const removerBusca = async (busca) => {
    if (!confirm(`Excluir a busca "${busca.nome}"?`)) return;
    await base44.entities.BuscaSalva.delete(busca.id);
    carregarBuscas();
  };

  const sincronizar = async (busca) => {
    setSincronizando(busca.id);
    setResultadoSync((r) => ({ ...r, [busca.id]: null }));
    try {
      const data = await buscarLicitacoes({
        uf: busca.uf,
        palavra_chave: busca.palavra_chave,
        modalidade: busca.modalidade,
        municipio_ibge: busca.municipio_ibge,
        pagina: 1,
        licitacoesPorPagina: busca.licitacoes_por_pagina || 50,
      });
      if (data.totalErros > 0) {
        setResultadoSync((r) => ({ ...r, [busca.id]: { erro: data.erros.map((e) => e.descricao).join("; ") } }));
        return;
      }
      const lics = toArray(data.licitacoes);
      const existentes = await base44.entities.Licitacao.list("-updated_date", 500);
      const existIds = new Set(toArray(existentes).map((l) => l.id_licitacao));
      const novas = lics
        .filter((l) => !existIds.has(l.id_licitacao))
        .map((l) => ({
          id_licitacao: l.id_licitacao,
          titulo: l.titulo,
          objeto: l.objeto,
          uf: l.uf,
          municipio: l.municipio,
          municipio_ibge: l.municipio_IBGE,
          orgao: l.orgao,
          abertura_datetime: l.abertura_datetime,
          abertura: l.abertura,
          tipo: l.tipo,
          id_tipo: l.id_tipo,
          valor: l.valor,
          link: l.link,
          link_externo: l.linkExterno,
          status: "interessado",
          favorito: false,
          busca_origem: busca.nome,
        }));
      if (novas.length > 0) {
        await base44.entities.Licitacao.bulkCreate(novas);
      }
      await base44.entities.BuscaSalva.update(busca.id, {
        ultima_sincronizacao: new Date().toISOString(),
        total_encontrado: Number(data.totalLicitacoes) || 0,
      });
      setResultadoSync((r) => ({
        ...r,
        [busca.id]: { novas: novas.length, total: Number(data.totalLicitacoes) || 0 },
      }));
      carregarBuscas();
    } catch (e) {
      setResultadoSync((r) => ({ ...r, [busca.id]: { erro: e.message } }));
    } finally {
      setSincronizando(null);
    }
  };

  // Funções de Destinatário
  const salvarDestinatario = async (dados) => {
    await base44.entities.Destinatario.create(dados);
    carregarDestinatarios();
  };

  const removerDestinatario = async (item) => {
    if (!window.confirm(`Excluir ${item.email} da lista de destinatários?`)) return;
    await base44.entities.Destinatario.delete(item.id);
    setDestinatarios((prev) => prev.filter((d) => d.id !== item.id));
  };

  const abas = [
    { id: "filtro", label: "Filtro / Busca" },
    { id: "destinatarios", label: "Destinatários" },
    { id: "sincronizacao", label: "Sincronização" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Configuração</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas buscas, destinatários e sincronizações.</p>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b">
        {abas.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aba === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das Abas */}
      {aba === "filtro" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Buscas Salvas</h2>
            <button
              onClick={() => { setEditando(null); setMostrarForm(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 shadow-sm shadow-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova busca
            </button>
          </div>

          {mostrarForm && (
            <BuscaForm
              initial={editando}
              onSave={salvarBusca}
              onCancel={() => { setMostrarForm(false); setEditando(null); }}
            />
          )}

          {loadingBuscas ? (
            <div className="text-center py-20 text-muted-foreground">Carregando buscas...</div>
          ) : buscasExibidas.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              Nenhuma busca salva. Crie uma para automatizar a captação de licitações.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {buscasExibidas.map((b) => {
                const res = resultadoSync[b.id];
                return (
                  <div key={b.id} className="bg-card border border-border/70 rounded-xl p-4 sm:rounded-2xl sm:p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    {/* Título + badge + ações */}
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold text-base sm:text-lg leading-tight truncate">{b.nome}</h3>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${b.ativa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {b.ativa ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => sincronizar(b)}
                          disabled={sincronizando === b.id}
                          title="Sincronizar agora"
                          className="p-2 rounded-lg border border-border/70 hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-50 transition-colors"
                        >
                          {sincronizando === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => enviarEmail(b)}
                          disabled={carregandoEmail === b.id}
                          title="Enviar resultados por e-mail"
                          className="p-2 rounded-lg border border-border/70 hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-50 transition-colors"
                        >
                          {carregandoEmail === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => { setEditando(b); setMostrarForm(true); }}
                          title="Editar"
                          className="p-2 rounded-lg border border-border/70 hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removerBusca(b)}
                          title="Excluir"
                          className="p-2 rounded-lg border border-border/70 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadados */}
                    <div className="mt-2.5 sm:mt-3 space-y-2">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {b.uf && (
                          <span className="inline-flex items-center gap-1 text-xs bg-muted/60 px-2 py-1 rounded-md">
                            <MapPin className="w-3 h-3 text-muted-foreground" /> <b className="text-foreground">{b.uf}</b>
                          </span>
                        )}
                        {b.municipio_nome && (
                          <span className="inline-flex items-center gap-1 text-xs bg-muted/60 px-2 py-1 rounded-md">
                            <MapPin className="w-3 h-3 text-muted-foreground" /> {b.municipio_nome}
                          </span>
                        )}
                        {b.palavra_chave && (
                          <span className="inline-flex items-center gap-1 text-xs bg-muted/60 px-2 py-1 rounded-md">
                            <Tag className="w-3 h-3 text-muted-foreground" /> {b.palavra_chave}
                          </span>
                        )}
                        {b.modalidade && (
                          <span className="inline-flex items-center gap-1 text-xs bg-muted/60 px-2 py-1 rounded-md">
                            <Tag className="w-3 h-3 text-muted-foreground" /> Modal: {b.modalidade}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {b.ultima_sincronizacao
                            ? new Date(b.ultima_sincronizacao).toLocaleString("pt-BR")
                            : "Nunca sincronizada"}
                        </span>
                        {b.total_encontrado ? (
                          <span className="inline-flex items-center gap-1">
                            <Search className="w-3 h-3" /> {b.total_encontrado} encontradas
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <BuscaToggles
                      busca={b}
                      onUpdated={(id, campo, valor) =>
                        setBuscas((lista) => lista.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)))
                      }
                    />

                    {/* Resultado da sync */}
                    {res && (
                      <div className={`mt-3 text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg ${res.erro ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                        {res.erro ? `Erro: ${res.erro}` : <><Check className="w-3.5 h-3.5" /> {res.novas} novas importadas de {res.total} encontradas</>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {aba === "destinatarios" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-4">Destinatários</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Lista de e-mails usada em todo o sistema para enviar licitações.
            </p>
          </div>

          <DestinatarioForm onSave={salvarDestinatario} />

          {loadingDestinatarios ? (
            <div className="text-center py-12 text-muted-foreground">Carregando destinatários...</div>
          ) : destinatarios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum destinatário cadastrado ainda.</div>
          ) : (
            <div className="space-y-2">
              {destinatarios.map((d) => (
                <div key={d.id} className="bg-card border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent text-primary flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {d.nome && <p className="text-sm font-medium truncate">{d.nome}</p>}
                    <p className="text-xs text-muted-foreground truncate">{d.email}</p>
                  </div>
                  <button
                    onClick={() => removerDestinatario(d)}
                    title="Excluir"
                    className="p-2 rounded-lg border hover:bg-red-50 hover:text-red-600 hover:border-red-200 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {aba === "sincronizacao" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-4">Sincronização</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Gerencie a sincronização automática de suas buscas salvas.
            </p>
          </div>

          {loadingBuscas ? (
            <div className="text-center py-20 text-muted-foreground">Carregando dados...</div>
          ) : buscasExibidas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma busca salva para sincronizar.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {buscasExibidas.map((b) => {
                const res = resultadoSync[b.id];
                return (
                  <div key={b.id} className="bg-card border border-border/70 rounded-xl p-4 sm:rounded-2xl sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{b.nome}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Última sincronização: {b.ultima_sincronizacao ? new Date(b.ultima_sincronizacao).toLocaleString("pt-BR") : "Nunca"}
                        </p>
                      </div>
                      <button
                        onClick={() => sincronizar(b)}
                        disabled={sincronizando === b.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {sincronizando === b.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" /> Sincronizar Agora
                          </>
                        )}
                      </button>
                    </div>

                    {res && (
                      <div className={`text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg ${res.erro ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                        {res.erro ? `Erro: ${res.erro}` : <><Check className="w-3.5 h-3.5" /> {res.novas} novas importadas de {res.total} encontradas</>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
