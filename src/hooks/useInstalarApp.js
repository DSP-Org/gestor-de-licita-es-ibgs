import { useState, useEffect } from "react";

const DISPENSADO_KEY = "licitaalerta_install_dispensado";

function estaInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function ehIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function useInstalarApp() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [instalado, setInstalado] = useState(estaInstalado);
  const [dispensado, setDispensado] = useState(
    () => sessionStorage.getItem(DISPENSADO_KEY) === "1"
  );

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => {
      setInstalado(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const instalar = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    if (outcome === "accepted") setInstalado(true);
  };

  const dispensar = () => {
    sessionStorage.setItem(DISPENSADO_KEY, "1");
    setDispensado(true);
  };

  const ios = ehIOS();
  // Mostra quando há prompt nativo disponível, ou no iOS (que não suporta o prompt)
  const podeMostrar = !instalado && !dispensado && (!!promptEvent || ios);

  return { podeMostrar, ios, instalar, dispensar, temPromptNativo: !!promptEvent };
}