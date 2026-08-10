import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";
import { STATUS_OPTIONS } from "@/shared/alertaApi";

const STATUS_CORES = {
  interessado: "#3b82f6",
  acompanhando: "#f59e0b",
  participando: "#a855f7",
  vencida: "#f97316",
  ganha: "#22c55e",
  perdida: "#ef4444",
  descartada: "#9ca3af",
};

export default function PainelStatus({ licitacoes, onFiltrarStatus, filtroStatus }) {
  const dados = useMemo(() => {
    return STATUS_OPTIONS.map((s) => ({
      name: s.label,
      value: licitacoes.filter((l) => l.status === s.value).length,
      key: s.value,
      cor: STATUS_CORES[s.value] || "#94a3b8",
    }));
  }, [licitacoes]);

  const total = licitacoes.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Gráfico de barras */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="font-heading font-semibold text-sm mb-3">Licitações por status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis allowDecimals tick={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {dados.map((d) => (
                  <Cell key={d.key} fill={d.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de rosca + legenda clicável */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="font-heading font-semibold text-sm mb-3">Distribuição</h3>
        {total === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Sem dados para exibir.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dados}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {dados.map((d) => (
                    <Cell key={d.key} fill={d.cor} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  formatter={(v) => [`${v} licitação(ões)`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legenda clicável que filtra por status */}
      <div className="lg:col-span-2 flex flex-wrap gap-2">
        {dados.map((d) => {
          const ativo = filtroStatus === d.key;
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <button
              key={d.key}
              onClick={() => onFiltrarStatus(ativo ? "todos" : d.key)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                ativo ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.cor }} />
              <span className="font-medium">{d.name}</span>
              <span className="opacity-80">{d.value} · {pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}