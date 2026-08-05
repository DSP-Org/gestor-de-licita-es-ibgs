import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import LicitacoesTicker from "@/components/landing/LicitacoesTicker";
import LandingHero from "@/components/landing/LandingHero";
import LandingFeatures from "@/components/landing/LandingFeatures";

const backgroundUrl = "https://media.base44.com/images/public/6a720719f600bb866f6561f7/8d59c0b1e_generated_image.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#020d17] text-slate-100">
      <LicitacoesTicker />
      <header className="relative z-30 border-b border-cyan-950 bg-[#03111d]/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-[#03111d]"><Bell className="h-5 w-5" /></span><div><p className="font-heading text-sm font-bold leading-none text-white">LicitaAlerta</p><p className="mt-1 text-[9px] text-slate-400">Gestão de licitações</p></div></div>
          <nav className="flex items-center gap-2"><Link to="/login" className="px-4 py-2 text-xs font-semibold text-slate-200">Entrar</Link><Link to="/register" className="rounded-xl border border-emerald-400 bg-cyan-950 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]">Criar conta</Link></nav>
        </div>
      </header>
      <main className="relative">
        <Image src={backgroundUrl} alt="Mapa tecnológico do Brasil conectado por oportunidades" className="absolute inset-0 h-full w-full opacity-75" fittingType="fill" />
        <div className="absolute inset-0 bg-[#020d17]/40" />
        <LandingHero />
        <LandingFeatures />
      </main>
      <footer className="relative border-t border-cyan-950 bg-[#132233] px-5 py-8 text-center text-xs text-slate-400">LicitaAlerta · Desenvolvido por Data5 Tecnologia · © {new Date().getFullYear()}</footer>
    </div>
  );
}