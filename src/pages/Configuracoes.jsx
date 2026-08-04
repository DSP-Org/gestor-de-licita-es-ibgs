import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, RefreshCw, Loader2, Mail, Check, Clock, Zap, BellRing, Smartphone } from "lucide-react";
import { useNotificacoesNativas } from "@/hooks/useNotificacoesNativas";

export default function Configuracoes() {
  const [buscas, setBuscas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState(null);
  const { permissao, solicitarPermissao, verificando, verificarNovas } = useNotificacoesNativas();

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

  const toggleCampo = async (busca, campo, valor) => {
    setAtualizando(busca.id + campo);
    try {
      await base44.entities.BuscaSalva.update(busca.id, { [campo]: valor });
      setBuscas((lista) => lista.map((b) => (b.id === busca.id ? { ...b, [campo]: valor } : b)));
    } finally {
      setAtualizando(null);
    }
  };

  const sincronizarAgora = async () => {
    setSincronizando(true);
    setResultadoSync(null);
    try {
      const res = await base44.functions.invoke("sincronizarBuscas", {});
      setResultadoSync(res.data || res);
      carregar();
    } catch (e) {
      setResultadoSync({ error: e.message });
    } finally {
      setSincronizando(false);
    }
  };

  const ativas = buscas.filter((b) => b.ativa).length;
  const comEmail = buscas.filter((b) => b.notificar_email !== false).length;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="font-heading text-2xl font-bold">Configurações de Automação</h1>
        <p className="text-sm text-muted-foreground">Gerencie a sincronização automática e as notificações por e-mail.</p>
      </div>

      {/* Resumo da automação */}
      <div className="bg-card border rounded-lg p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-semibold">Sincronização Automática Diária</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Todos os dias úteis às 09:00 (horário de Brasília), o sistema consulta a API, importa novas licitações e envia e-mails conforme as configurações abaixo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{buscas.length}</p>
            <p className="text-xs text-muted-foreground">Buscas salvas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{ativas}</p>
            <p className="text-xs text-muted-foreground">Ativas na sync</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{comEmail}</p>
            <p className="text-xs text-muted-foreground">Com e-mail ativo</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <button
            onClick={sincronizarAgora}
            disabled={sincronizando || ativas === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {sincronizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {sincronizando ? "Sincronizando..." : "Executar sincronização agora"}
          </button>
        </div>

        {resultadoSync && (
          <div className={`text-sm rounded-md p-3 ${resultadoSync.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {resultadoSync.error ? (
              `Erro: ${resultadoSync.error}`
            ) : (
              <div className="space-y-1">
                <p className="font-medium flex items-center gap-1.5"><Check className="w-4 h-4" /> {resultadoSync.buscasProcessadas} busca(s) processada(s), {resultadoSync.totalNovas} nova(s) licitação(ões).</p>
                {resultadoSync.resumo?.length > 0 && (
                  <ul className="text-xs space-y-0.5 mt-2">
                    {resultadoSync.resumo.map((r, i) => (
                      <li key={i}>
                        <b>{r.busca}</b>: {r.erro ? `❌ ${r.erro}` : `${r.novas} novas de ${r.total}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notificações no celular */}
      <div className="bg-card border rounded-lg p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-semibold">Notificações no celular</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Receba alertas no aparelho quando novas licitações forem encontradas. Funciona com o app instalado (PWA).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          {permissao === "granted" ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-md">
                <Check className="w-4 h-4" /> Notificações ativadas
              </span>
              <button
                onClick={verificarNovas}
                disabled={verificando}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
              >
                {verificando ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                Verificar agora
              </button>
            </>
          ) : permissao === "denied" ? (
            <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md">
              Permissão negada. Habilite as notificações nas configurações do navegador/sistema.
            </span>
          ) : permissao === "unsupported" ? (
            <span className="text-sm text-muted-foreground">Seu dispositivo não suporta notificações nativas.</span>
          ) : (
            <button
              onClick={solicitarPermissao}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90"
            >
              <BellRing className="w-4 h-4" /> Ativar notificações
            </button>
          )}
        </div>
      </div>

      {/* Lista de buscas com toggles */}
      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-sm">Configurações por busca</h3>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Carregando...</div>
        ) : buscas.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg">
            Nenhuma busca salva. Crie buscas em "Buscas Salvas" para configurá-las aqui.
          </div>
        ) : (
          <div className="space-y-2">
            {buscas.map((b) => (
              <div key={b.id} className="bg-card border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-medium">{b.nome}</h4>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      {b.uf && <span>UF: <b className="text-foreground">{b.uf}</b></span>}
                      {b.municipio_nome && <span>Município: <b className="text-foreground">{b.municipio_nome}</b></span>}
                      {b.palavra_chave && <span>Palavras: <b className="text-foreground">{b.palavra_chave}</b></span>}
                    </div>
                    {b.ultima_sincronizacao && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Última sync: {new Date(b.ultima_sincronizacao).toLocaleString("pt-BR")}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs">
                      <span className="text-muted-foreground">E-mails: <b className="text-foreground">{(b.destinatarios_email || []).length || "dono da busca"}</b></span>
                      {b.telegram_chats && <span className="text-muted-foreground">Telegram: <b className="text-foreground">{b.telegram_chats.split(",").filter(Boolean).length} chat(s)</b></span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t">
                  <Toggle
                    label="Sincronização automática"
                    icon={RefreshCw}
                    checked={!!b.ativa}
                    onChange={(v) => toggleCampo(b, "ativa", v)}
                    loading={atualizando === b.id + "ativa"}
                    description="Participa da sync diária"
                  />
                  <Toggle
                    label="Notificar por e-mail"
                    icon={Mail}
                    checked={b.notificar_email !== false}
                    onChange={(v) => toggleCampo(b, "notificar_email", v)}
                    loading={atualizando === b.id + "notificar_email"}
                    description="Envia e-mail ao achar novas"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, icon: Icon, checked, onChange, loading, description }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={loading}
      className="flex items-center gap-2 text-sm disabled:opacity-50"
    >
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
      <Icon className={`w-4 h-4 ${checked ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-left">
        <span className="font-medium block leading-tight">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
    </button>
  );
}