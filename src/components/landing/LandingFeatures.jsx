import { Bell, Search, Target } from "lucide-react";

const recursos = [
  { icon: Search, title: "Busca inteligente", text: "Pesquise por palavras-chave, estados, municípios e modalidades." },
  { icon: Bell, title: "Alertas automáticos", text: "Receba novas oportunidades encontradas pelas suas buscas salvas." },
  { icon: Target, title: "Gestão centralizada", text: "Acompanhe status, valores, prazos e anotações de cada processo." },
];

export default function LandingFeatures() {
  return (
    <section className="border-y bg-card/70">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="mb-9 max-w-2xl"><p className="text-xs font-bold uppercase tracking-widest text-primary">Tudo em um só lugar</p><h2 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">Da descoberta ao acompanhamento</h2></div>
        <div className="grid gap-4 md:grid-cols-3">
          {recursos.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border bg-background p-5"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary"><Icon className="h-5 w-5" /></div><h3 className="font-heading font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}
        </div>
      </div>
    </section>
  );
}