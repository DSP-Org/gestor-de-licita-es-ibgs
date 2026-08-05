import { ArrowRight, BellRing, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingHero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"><BellRing className="h-3.5 w-3.5" /> Inteligência para licitações públicas</span>
        <h1 className="mt-5 font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">Encontre oportunidades antes da concorrência.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Monitore editais, automatize buscas e organize suas licitações em um só lugar. Menos tempo procurando, mais tempo preparando propostas vencedoras.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90">Criar minha conta <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/login" className="inline-flex items-center justify-center rounded-xl border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted">Já tenho acesso</Link>
        </div>
      </div>
      <div className="rounded-3xl border bg-card p-5 shadow-xl shadow-primary/10 sm:p-7">
        <p className="text-sm font-semibold">Seu radar de oportunidades</p>
        <div className="mt-5 space-y-4">
          {["Buscas automáticas todos os dias", "Alertas de novas oportunidades", "Gestão completa das licitações", "Resultados organizados por interesse"].map((texto) => <div key={texto} className="flex items-center gap-3 rounded-xl bg-muted/60 p-3.5 text-sm font-medium"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />{texto}</div>)}
        </div>
      </div>
    </section>
  );
}