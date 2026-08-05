import { MapPin } from "lucide-react";

const itens = [
  "Pregão eletrônico · Equipamentos de informática · Curitiba/PR",
  "Concorrência · Serviços de engenharia · São Paulo/SP",
  "Dispensa eletrônica · Materiais hospitalares · Recife/PE",
  "Pregão eletrônico · Soluções em tecnologia · Brasília/DF",
  "Concorrência · Obras de infraestrutura · Belo Horizonte/MG",
];

export default function LicitacoesTicker() {
  const lista = [...itens, ...itens];
  return (
    <div className="overflow-hidden border-y bg-card py-2.5" aria-label="Exemplos de licitações recentes">
      <div className="animate-ticker flex w-max items-center">
        {lista.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-2 px-6 text-xs font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {item}
          </span>
        ))}
      </div>
    </div>
  );
}