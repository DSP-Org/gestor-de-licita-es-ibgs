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
      colorClass: "bg-red-100 text-red-700 border-red-300 font-bold animate-pulse dark:bg-red-950/50 dark:text-red-300",
      urgente: true,
      dtAbertura,
    };
  }

  if (diffDias === 1) {
    return {
      tipo: "amanha",
      label: "Abre Amanhã",
      diasRestantes: 1,
      colorClass: "bg-amber-100 text-amber-800 border-amber-300 font-semibold dark:bg-amber-950/50 dark:text-amber-300",
      urgente: true,
      dtAbertura,
    };
  }

  if (diffDias <= 3) {
    return {
      tipo: "urgente",
      label: `Em ${diffDias} dias`,
      diasRestantes: diffDias,
      colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
      urgente: true,
      dtAbertura,
    };
  }

  if (diffDias <= 7) {
    return {
      tipo: "em_breve",
      label: `Em ${diffDias} dias`,
      diasRestantes: diffDias,
      colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
      urgente: false,
      dtAbertura,
    };
  }

  return {
    tipo: "futuro",
    label: `Em ${diffDias} dias`,
    diasRestantes: diffDias,
    colorClass: "bg-muted text-muted-foreground border-transparent",
    urgente: false,
    dtAbertura,
  };
}
