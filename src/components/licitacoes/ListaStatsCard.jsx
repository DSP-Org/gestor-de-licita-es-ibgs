import { FileText, Clock, CheckCircle2, TrendingUp, Wallet } from "lucide-react";

export default function ListaStatsCard({ licitacoes, lista }) {
  if (!lista || licitacoes.length === 0) return null;

  const stats = calcularEstatisticas(licitacoes);
  const maioresOportunidades = licitacoes
    .sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0))
    .slice(0, 3);

  return (
    <div className="bg-card border rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Estatísticas da Lista</h3>
        <div className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: `var(--color-${lista.cor || "blue"})10` }}>
          {lista.nome}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatItem icon={FileText} label="Total" value={stats.total} color="text-blue-600 bg-blue-50" />
        <StatItem icon={Clock} label="Acompanhando" value={stats.acompanhando} color="text-purple-600 bg-purple-50" />
        <StatItem icon={CheckCircle2} label="Ganhas" value={stats.ganhas} color="text-green-600 bg-green-50" />
        <StatItem icon={TrendingUp} label="Participando" value={stats.participando} color="text-orange-600 bg-orange-50" />
        <StatItem icon={Wallet} label="Valor Total" value={stats.valorTotal} color="text-emerald-600 bg-emerald-50" isValor />
      </div>

      {maioresOportunidades.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Maiores Oportunidades</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {maioresOportunidades.map((l) => (
              <div key={l.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-muted">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug truncate">{l.titulo}</p>
                  <p className="text-xs text-muted-foreground truncate">{l.orgao}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-emerald-600">
                    {(Number(l.valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ icon: Icon, label, value, color, isValor = false }) {
  return (
    <div className={`flex flex-col items-center justify-center p-2.5 rounded-lg border ${color}`}>
      <Icon className="w-4 h-4 mb-1" />
      <p className="text-sm sm:text-base font-bold">{isValor ? formatarValor(value) : value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function calcularEstatisticas(licitacoes) {
  const stats = {
    total: licitacoes.length,
    valorTotal: 0,
    ganhas: 0,
    acompanhando: 0,
    participando: 0,
  };

  licitacoes.forEach((l) => {
    stats.valorTotal += Number(l.valor) || 0;
    if (l.status === "ganha") stats.ganhas++;
    if (l.status === "acompanhando") stats.acompanhando++;
    if (l.status === "participando") stats.participando++;
  });

  return stats;
}

function formatarValor(valor) {
  if (valor === 0) return "R$ 0";
  if (valor >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
  }
  if (valor >= 1_000) {
    return `R$ ${(valor / 1_000).toFixed(1)}K`;
  }
  return `R$ ${valor.toFixed(0)}`;
}
