import { ArrowRight, Radar } from "lucide-react";
import { Link } from "react-router-dom";
import CommandMetrics from "@/components/landing/CommandMetrics";

export default function LandingHero() {
  return (
    <section className="relative mx-auto grid min-h-[690px] max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.18fr_.82fr] lg:items-center">
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-secondary px-3 py-1.5 text-[10px] font-semibold text-primary"><Radar className="h-3.5 w-3.5" /> Inteligência para licitações públicas</span>
        <h1 className="mt-7 max-w-3xl font-heading text-5xl font-extrabold leading-[1.03] tracking-tight text-foreground sm:text-6xl"><span className="block">Encontre</span><span className="block">oportunidades antes</span><span className="block">da concorrência.</span></h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">Monitore editais, automatize buscas e organize suas licitações em um só lugar. Menos tempo procurando, mais tempo preparando propostas vencedoras.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25">Criar minha conta <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/login" className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm">Já tenho acesso</Link>
        </div>
      </div>
      <div className="relative z-10"><CommandMetrics /></div>
    </section>
  );
}