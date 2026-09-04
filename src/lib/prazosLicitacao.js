/**
 * Helper para cálculo de prazos e urgência de abertura de licitações.
 * Sempre calibrado com o fuso horário de Brasília/São Paulo (America/Sao_Paulo).
 */

export function parseDataAbertura(abertura_datetime, abertura) {
  if (abertura_datetime) {
    const d = new Date(abertura_datetime);
    if (!isNaN(d.getTime())) return d;
  }
  if (abertura && typeof abertura === "string") {
    // Trata formato dd/mm/aaaa ou dd/mm/aaaa hh:mm
    const partes = abertura.trim().split(" ");
    const dataPartes = partes[0].split("/");
    if (dataPartes.length === 3) {
      const dia = dataPartes[0].padStart(2, "0");
      const mes = dataPartes[1].padStart(2, "0");
      const ano = dataPartes[2];
      const hora = partes[1] || "00:00";
      const iso = `${ano}-${mes}-${dia}T${hora}:00-03:00`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

export function calcularUrgenciaAbertura(abertura_datetime, abertura) {
  const dtAbertura = parseDataAbertura(abertura_datetime, abertura);
  if (!dtAbertura) {
    return {
      tipo: "sem_data",
      label: "Sem data",
      diasRestantes: null,
      colorClass: "bg-muted text-muted-foreground border-transparent",
      urgente: false,
    };
  }

  const hojeSPString = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const hojeZeroHora = new Date(`${hojeSPString}T00:00:00-03:00`);
  const amanhaZeroHora = new Date(hojeZeroHora.getTime() + 24 * 60 * 60 * 1000);

  const diffDias = Math.ceil((dtAbertura.getTime() - hojeZeroHora.getTime()) / (1000 * 60 * 60 * 24));

  if (dtAbertura < hojeZeroHora) {
    return {
      tipo: "encerrada",
      label: "Encerrada",
      diasRestantes: diffDias,
      colorClass: "bg-muted/80 text-muted-foreground border-muted",
      urgente: false,
      dtAbertura,
    };
  }

  if (dtAbertura >= hojeZeroHora && dtAbertura < amanhaZeroHora) {
    const hora = dtAbertura.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      tipo: "hoje",
      label: hora && hora !== "00:00" ? `Hoje às ${hora}` : "Abre Hoje!",
      diasRestantes: 0,
      colorClass: "bg-rose-50 text-rose-700 border-rose-200/80 shadow-[0_0_12px_rgba(244,63,94,0.15)] animate-pulse dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
      urgente: true,
      dtAbertura,
    };
  }

  if (diffDias === 1) {
    return {
      tipo: "amanha",
      label: "Abre Amanhã",
      diasRestantes: 1,
      colorClass: "bg-amber-50/90 text-amber-800 border-amber-200/80 shadow-xs dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
      urgente: true,
      dtAbertura,
    };
  }

  if (diffDias <= 3) {
    return {
      tipo: "urgente",
      label: `Em ${diffDias} dias`,
      diasRestantes: diffDias,
      colorClass: "bg-amber-50/60 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40",
      urgente: true,
      dtAbertura,
    };
  }

  if (diffDias <= 7) {
    return {
      tipo: "em_breve",
      label: `Em ${diffDias} dias`,
      diasRestantes: diffDias,
      colorClass: "bg-sky-50/70 text-sky-700 border-sky-200/70 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/40",
      urgente: false,
      dtAbertura,
    };
  }

  return {
    tipo: "futuro",
    label: `Em ${diffDias} dias`,
    diasRestantes: diffDias,
    colorClass: "bg-slate-50 text-slate-600 border-slate-200/60 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
    urgente: false,
    dtAbertura,
  };
}
