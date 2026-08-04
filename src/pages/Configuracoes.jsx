import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Loader2, Check, Zap, BellRing, Smartphone, Clock, Save } from "lucide-react";
import { useNotificacoesNativas } from "@/hooks/useNotificacoesNativas";

export default function Configuracoes() {
  const [buscas, setBuscas] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState(null);
  const [horario, setHorario] = useState("09:00");
  const [salvandoHorario, setSalvandoHorario] = useState(false);
  const [horarioSalvo, setHorarioSalvo] = useState(false);
  const { permissao, solicitarPermissao, verificando, verificarNovas } = useNotificacoesNativas();

  const carregar = async () => {
    const lista = await base44.entities.BuscaSalva.list("-updated_date", 100);
    setBuscas(lista);
    const h = lista.find((b) => b.horario_sincronizacao)?.horario_sincronizacao;
    if (h) setHorario(h);
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvarHorario = async () => {
    setSalvandoHorario(true);
    setHorarioSalvo(false);
    try {
      await Promise.all(
        buscas.map((b) =>
          base44.entities.BuscaSalva.update(b.id, { horario_sincronizacao: horario })
        )
      );
      setBuscas((lista) => lista.map((b) => ({ ...b, horario_sincronizacao: horario })));
      setHorarioSalvo(true);
      setTimeout(() => setHorarioSalvo(false), 3000);
    } finally {
      setSalvandoHorario(false);
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
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Configurações de Automação</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie a sincronização automática e as notificações por e-mail.</p>
      </div>

      {/* Card principal de automação */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/20">
            <Bell className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-semibold text-lg">Sincronização Automática Diária</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Todos os dias úteis às <b className="text-foreground">{horario}</b> (horário de Brasília), o sistema consulta a API, importa novas licitações e envia e-mails conforme as configurações de cada busca.
            </p>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{buscas.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Buscas salvas</p>
          </div>
          <div className="text-center border-x border-border/40">
            <p className="text-2xl sm:text-3xl font-bold text-green-600 tabular-nums">{ativas}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ativas na sync</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">{comEmail}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Com e-mail ativo</p>
          </div>
        </div>

        {/* Horário da automação */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">Horário da sincronização</label>
          </div>
          <input
            type="time"
            value={horario}
            onChange={(e) => { setHorario(e.target.value); setHorarioSalvo(false); }}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
          />
          <button
            onClick={salvarHorario}
            disabled={salvandoHorario || buscas.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {salvandoHorario ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar horário
          </button>
          {horarioSalvo && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" /> Horário atualizado
            </span>
          )}
        </div>

        {/* Botão executar + resultado */}
        <div className="pt-4 border-t border-border/60 space-y-3">
          <button
            onClick={sincronizarAgora}
            disabled={sincronizando || ativas === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 shadow-sm shadow-primary/20 disabled:opacity-50 transition-colors"
          >
            {sincronizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {sincronizando ? "Sincronizando..." : "Executar sincronização agora"}
          </button>

          {resultadoSync && (
            <div className={`text-sm rounded-lg p-3 ${resultadoSync.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {resultadoSync.error ? (
                `Erro: ${resultadoSync.error}`
              ) : (
                <div className="space-y-1.5">
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
      </div>

      {/* Notificações no celular */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/20">
            <Smartphone className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-semibold text-lg">Notificações no celular</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Receba alertas no aparelho quando novas licitações forem encontradas. Funciona com o app instalado (PWA).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
          {permissao === "granted" ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                <Check className="w-4 h-4" /> Notificações ativadas
              </span>
              <button
                onClick={verificarNovas}
                disabled={verificando}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {verificando ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                Verificar agora
              </button>
            </>
          ) : permissao === "denied" ? (
            <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
              Permissão negada. Habilite as notificações nas configurações do navegador/sistema.
            </span>
          ) : permissao === "unsupported" ? (
            <span className="text-sm text-muted-foreground">Seu dispositivo não suporta notificações nativas.</span>
          ) : (
            <button
              onClick={solicitarPermissao}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 shadow-sm shadow-primary/20 transition-colors"
            >
              <BellRing className="w-4 h-4" /> Ativar notificações
            </button>
          )}
        </div>
      </div>
    </div>
  );
}