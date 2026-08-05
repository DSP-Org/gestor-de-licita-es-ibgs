import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import LicitacoesTicker from "@/components/landing/LicitacoesTicker";
import LandingHero from "@/components/landing/LandingHero";
import LandingFeatures from "@/components/landing/LandingFeatures";

const backgroundUrl = "https://media.base44.com/images/public/6a720719f600bb866f6561f7/8d59c0b1e_generated_image.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <LicitacoesTicker />
      <header className="relative z-30 border-b border-border bg-card/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Bell className="h-5 w-5" /></span><div><p className="font-heading text-sm font-bold leading-none text-foreground">Licitalerta360</p><p className="mt-1 text-[9px] text-muted-foreground">Gestão de licitações</p></div></div>
          <nav className="flex items-center gap-2"><Link to="/login" className="px-4 py-2 text-xs font-semibold text-foreground">Entrar</Link><Link to="/register" className="rounded-xl border border-primary bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25">Criar conta</Link></nav>
        </div>
      </header>
      <main className="relative">
        <Image src={backgroundUrl} alt="Mapa tecnológico do Brasil conectado por oportunidades" className="absolute inset-0 h-full w-full opacity-20 mix-blend-multiply hue-rotate-[25deg] saturate-150" fittingType="fill" />
        <div className="absolute inset-0 bg-background/70" />
        <LandingHero />
        <LandingFeatures />
      </main>
      <footer className="relative border-t border-border bg-card px-5 py-8 text-center text-xs text-muted-foreground">Licitalerta360 · Desenvolvido por Data5 Tecnologia · © {new Date().getFullYear()}</footer>
    </div>
  );
}