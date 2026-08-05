import { Bell, Search, Target } from "lucide-react";

const recursos = [
  { icon: Search, badge: "Busca automatizada", title: "Busca inteligente", text: "Pesquise por palavras-chave, estados, municípios e modalidades." },
  { icon: Bell, badge: "Alertas automáticos", title: "Alertas automáticos", text: "Receba novas oportunidades encontradas pelas suas buscas salvas." },
  { icon: Target, badge: "Gestão centralizada", title: "Gestão centralizada", text: "Acompanhe status, valores, prazos e anotações de cada processo." },
];

export default function LandingFeatures() {
  return (
    <section className="relative mx-auto max-w-6xl px-5 pb-28 pt-14 sm:px-8">
      <div className="mb-12 max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Tudo em um só lugar</p><h2 className="mt-3 font-heading text-3xl font-bold text-slate-100 sm:text-4xl">Da descoberta ao acompanhamento</h2></div>
      <div className="grid gap-5 md:grid-cols-3">
        {recursos.map(({ icon: Icon, badge, title, text }) => <article key={title} className="rounded-2xl border border-cyan-900 bg-[#071522]/95 p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-950 text-cyan-400"><Icon className="h-6 w-6" /></span><span className="rounded-full bg-emerald-950/70 px-3 py-1 text-[9px] text-emerald-400">{badge}</span></div><h3 className="font-heading text-lg font-semibold text-slate-100">{title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{text}</p><div className="mt-5 border-t border-slate-800 pt-4"><div className="mb-2 flex justify-between text-[9px] text-slate-500"><span>Progresso</span><span>85%</span></div><div className="h-1 rounded-full bg-slate-800"><div className="h-1 w-2/3 rounded-full bg-cyan-400" /></div></div></article>)}
      </div>
    </section>
  );
}