import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import LicitacoesTicker from "@/components/landing/LicitacoesTicker";
import LandingHero from "@/components/landing/LandingHero";
import LandingFeatures from "@/components/landing/LandingFeatures";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Bell className="h-5 w-5" /></span><div><p className="font-heading text-sm font-bold leading-none">LicitaAlerta</p><p className="mt-1 text-[10px] text-muted-foreground">Gestão de licitações</p></div></div>
          <nav className="flex items-center gap-2"><Link to="/login" className="px-3 py-2 text-sm font-semibold hover:text-primary">Entrar</Link><Link to="/register" className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground">Criar conta</Link></nav>
        </div>
      </header>
      <LicitacoesTicker />
      <LandingHero />
      <LandingFeatures />
      <footer className="px-5 py-8 text-center text-xs text-muted-foreground">LicitaAlerta · Desenvolvido por Data5 Tecnologia · © {new Date().getFullYear()}</footer>
    </div>
  );
}