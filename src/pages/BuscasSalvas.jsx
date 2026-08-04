import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { buscarLicitacoes } from "@/shared/alertaApi";
import { Plus, Pencil, Trash2, RefreshCw, Loader2, Check, Mail } from "lucide-react";
import BuscaForm from "@/components/buscas/BuscaForm";
import EmailResultsDialog from "@/components/licitacoes/EmailResultsDialog";

export default function BuscasSalvas() {
  const [buscas, setBuscas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [sincronizando, setSincronizando] = useState(null);
  const [resultadoSync, setResultadoSync] = useState({});
  const [emailBusca, setEmailBusca] = useState(null);
  const [emailLics, setEmailLics] = useState([]);
  const [carregandoEmail, setCarregandoEmail] = useState(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const lista = await base44.entities.BuscaSalva.list("-updated_date", 100);
      setBuscas(lista);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvar = async (form) => {
    if (editando?.id) {
      await base44.entities.BuscaSalva.update(editando.id, form);
    } else {
      await base44.entities.BuscaSalva.create(form);
    }
    setMostrarForm(false);
    setEditando(null);
    carregar();
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
      setEmailLics(data.licitacoes || []);
      setEmailBusca(busca);
    } catch (e) {
      setResultadoSync((r) => ({ ...r, [busca.id]: { erro: e.message } }));
    } finally {
      setCarregandoEmail(null);
    }
  };

  const remover = async (busca) => {
    if (!confirm(`Excluir a busca "${busca.nome}"?`)) return;
    await base44.entities.BuscaSalva.delete(busca.id);
    carregar();
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
      const lics = data.licitacoes || [];
      const existentes = await base44.entities.Licitacao.list("-updated_date", 500);
      const existIds = new Set(existentes.map((l) => l.id_licitacao));
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
      carregar();
    } catch (e) {
      setResultadoSync((r) => ({ ...r, [busca.id]: { erro: e.message } }));
    } finally {
      setSincronizando(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Buscas Salvas</h1>
          <p className="text-sm text-muted-foreground">Crie filtros recorrentes e sincronize licitações com um clique.</p>
        </div>
        <button
          onClick={() => { setEditando(null); setMostrarForm(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Nova busca
        </button>
      </div>

      {mostrarForm && (
        <BuscaForm
          initial={editando}
          onSave={salvar}
          onCancel={() => { setMostrarForm(false); setEditando(null); }}
        />
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando buscas...</div>
      ) : buscas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nenhuma busca salva. Crie uma para automatizar a captação de licitações.
        </div>
      ) : (
        <div className="space-y-3">
          {buscas.map((b) => {
            const res = resultadoSync[b.id];
            return (
              <div key={b.id} className="bg-card border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold">{b.nome}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${b.ativa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {b.ativa ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      {b.uf && <span>UF: <b className="text-foreground">{b.uf}</b></span>}
                      {b.municipio_nome && <span>Município: <b className="text-foreground">{b.municipio_nome}</b></span>}
                      {b.palavra_chave && <span>Palavras: <b className="text-foreground">{b.palavra_chave}</b></span>}
                      {b.modalidade && <span>Modalidade: <b className="text-foreground">{b.modalidade}</b></span>}
                      {b.municipio_ibge && <span>IBGE: <b className="text-foreground">{b.municipio_ibge}</b></span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {b.ultima_sincronizacao
                        ? `Última sync: ${new Date(b.ultima_sincronizacao).toLocaleString("pt-BR")}`
                        : "Nunca sincronizada"}
                      {b.total_encontrado ? ` · ${b.total_encontrado} encontradas` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => sincronizar(b)}
                      disabled={sincronizando === b.id}
                      title="Sincronizar agora"
                      className="p-2 rounded-md border hover:bg-muted disabled:opacity-50"
                    >
                      {sincronizando === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => enviarEmail(b)}
                      disabled={carregandoEmail === b.id}
                      title="Enviar resultados por e-mail"
                      className="p-2 rounded-md border hover:bg-muted disabled:opacity-50"
                    >
                      {carregandoEmail === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setEditando(b); setMostrarForm(true); }}
                      title="Editar"
                      className="p-2 rounded-md border hover:bg-muted"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => remover(b)}
                      title="Excluir"
                      className="p-2 rounded-md border hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {res && (
                  <div className={`mt-2 text-xs flex items-center gap-1.5 ${res.erro ? "text-red-600" : "text-green-600"}`}>
                    {res.erro ? `Erro: ${res.erro}` : <><Check className="w-3.5 h-3.5" /> {res.novas} novas importadas de {res.total} encontradas</>}
                  </div>
                )}
              </div>
            );
          })}
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