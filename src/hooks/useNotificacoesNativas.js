import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook que gerencia permissão de notificações nativas (PWA/celular)
 * e verifica periodicamente se há novas licitações para o usuário.
 */
export function useNotificacoesNativas() {
  const [permissao, setPermissao] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [verificando, setVerificando] = useState(false);
  const ultimoTotalRef = useRef(null);

  // Registra o service worker para suporte a notificações em background
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {});
    }
  }, []);

  const solicitarPermissao = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported";
    try {
      const res = await Notification.requestPermission();
      setPermissao(res);
      return res;
    } catch {
      return "denied";
    }
  }, []);

  // Verifica novas licitações comparando com o total anterior
  const verificarNovas = useCallback(async () => {
    if (permissao !== "granted") return;
    setVerificando(true);
    try {
      // Escopo é sempre o usuário logado, nunca o seletor do master: a notificação
      // é pessoal, e o contador de referência (ibgs_ultimo_total) é único. Se o
      // total oscilasse ao trocar de usuário no seletor, o master receberia
      // avisos de "novas licitações" que são apenas a troca de visão.
      const eu = await base44.auth.me().catch(() => null);
      if (!eu?.id) return;
      const lista = await base44.entities.Licitacao.filter(
        { $or: [{ usuario_id: eu.id }, { created_by_id: eu.id }] },
        "-created_date",
        500,
      );
      const total = lista.length;
      const armazenado = Number(localStorage.getItem("ibgs_ultimo_total") || 0);

      if (armazenado > 0 && total > armazenado) {
        const novas = total - armazenado;
        const titulo = `🔔 ${novas} nova(s) licitação(ões)`;
        const corpo = "Toque para abrir o painel e conferir.";
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(titulo, {
              body: corpo,
              icon: "https://base44.com/logo_v2.svg",
              badge: "https://base44.com/logo_v2.svg",
              tag: "ibgs-novas-licitacoes",
              data: { url: "/" },
            });
          });
        } else if (typeof Notification !== "undefined") {
          new Notification(titulo, { body: corpo, icon: "https://base44.com/logo_v2.svg" });
        }
      }
      localStorage.setItem("ibgs_ultimo_total", String(total));
      ultimoTotalRef.current = total;
    } catch {
      // silencioso
    } finally {
      setVerificando(false);
    }
  }, [permissao]);

  // Verifica ao montar e a cada 5 minutos
  useEffect(() => {
    if (permissao !== "granted") return;
    verificarNovas();
    const intervalo = setInterval(verificarNovas, 5 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, [permissao, verificarNovas]);

  return { permissao, solicitarPermissao, verificarNovas, verificando };
}