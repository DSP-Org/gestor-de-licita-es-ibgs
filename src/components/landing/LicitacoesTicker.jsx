import { MapPin } from "lucide-react";

const itens = [
  "Pregão eletrônico · Equipamentos de informática · Curitiba/PR",
  "Concorrência · Serviços de engenharia · São Paulo/SP",
  "Dispensa eletrônica · Materiais hospitalares · Recife/PE",
  "Pregão eletrônico · Soluções em tecnologia · Brasília/DF",
  "Concorrência · Obras de infraestrutura · Belo Horizonte/MG",
];

export default function LicitacoesTicker() {
  return (
    <div className="border-b border-cyan-950 bg-[#04111d]">
      <div className="hidden h-9 overflow-hidden border-b border-cyan-950/80 text-[8px] text-emerald-500/60 md:flex md:items-center md:justify-around">
        {itens.concat(itens).map((item, i) => <span key={i} className="max-w-32 truncate">{item} · R$ {(92000 + i * 13750).toLocaleString("pt-BR")}</span>)}
      </div>
      <div className="overflow-hidden py-2.5">
        <div className="animate-ticker flex w-max items-center">
          {itens.concat(itens).map((item, index) => <span key={`${item}-${index}`} className="flex items-center gap-2 px-6 text-[10px] font-medium text-slate-300"><MapPin className="h-3 w-3 text-cyan-400" />{item}</span>)}
        </div>
      </div>
    </div>
  );
}