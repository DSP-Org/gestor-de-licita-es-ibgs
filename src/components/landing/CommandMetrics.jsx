import { CheckCircle2 } from "lucide-react";

const radar = ["Buscas automáticas todos os dias", "Alertas de novas oportunidades", "Gestão completa das licitações", "Resultados organizados por interesse"];
const metricas = [
  ["Alertas ativos", "203"],
  ["Processos geridos", "546"],
  ["Novas licitações", "434"],
];

export default function CommandMetrics() {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-primary/40 bg-card p-6 shadow-xl shadow-primary/10">
        <h2 className="mb-5 text-sm font-bold text-foreground">Seu radar de oportunidades</h2>
        <div className="space-y-3">{radar.map((item) => <div key={item} className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-xs text-foreground"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />{item}</div>)}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metricas.map(([label, valor]) => <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-[9px] font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold text-primary">{valor}</p></div>)}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-[9px] font-bold uppercase text-muted-foreground">Novas licitações (24h)</p><div className="mt-3 flex h-9 items-end gap-1">{[2,5,3,8,4,7,11,6,9,5,12,8,4,10].map((h,i)=><span key={i} className="w-1.5 bg-primary" style={{height:`${h*3}px`}} />)}</div></div>
      </div>
    </div>
  );
}