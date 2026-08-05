import { CheckCircle2 } from "lucide-react";

const radar = ["Buscas automáticas todos os dias", "Alertas de novas oportunidades", "Gestão completa das licitações", "Resultados organizados por interesse"];
const metricas = [
  ["Alertas ativos", "203", "text-cyan-400"],
  ["Processos geridos", "546", "text-emerald-400"],
  ["Novas licitações", "434", "text-emerald-400"],
];

export default function CommandMetrics() {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-emerald-400 bg-[#071522]/95 p-6 shadow-[0_0_40px_rgba(16,185,129,0.22)]">
        <h2 className="mb-5 text-sm font-bold text-slate-100">Seu radar de oportunidades</h2>
        <div className="space-y-3">{radar.map((item) => <div key={item} className="flex items-center gap-3 rounded-xl bg-[#122231] px-4 py-3 text-xs text-slate-200"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />{item}</div>)}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metricas.map(([label, valor, cor]) => <div key={label} className="rounded-xl border border-cyan-900 bg-[#091826]/95 p-4"><p className="text-[9px] font-bold uppercase text-slate-300">{label}</p><p className={`mt-1 text-3xl font-bold ${cor}`}>{valor}</p></div>)}
        <div className="rounded-xl border border-cyan-900 bg-[#091826]/95 p-4"><p className="text-[9px] font-bold uppercase text-slate-300">Novas licitações (24h)</p><div className="mt-3 flex h-9 items-end gap-1">{[2,5,3,8,4,7,11,6,9,5,12,8,4,10].map((h,i)=><span key={i} className="w-1.5 bg-emerald-400" style={{height:`${h*3}px`}} />)}</div></div>
      </div>
    </div>
  );
}