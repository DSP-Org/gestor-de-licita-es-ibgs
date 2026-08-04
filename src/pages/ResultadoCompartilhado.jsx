import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell, ExternalLink, Loader2, MapPin, Building2, Calendar, AlertCircle } from "lucide-react";
import { formatValor } from "@/components/licitacoes/LicitacaoCard";

export default function ResultadoCompartilhado() {
  const { codigo } = useParams();
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    base44.functions
      .invoke("buscarResultadoCompartilhado", { codigo })
      .then((res) => {
        if (cancelado) return;
        const data = res?.data || res;
        if (data?.error) {
          setErro(data.error);
        } else {
          setResultado(data);
        }
      })
      .catch((e) => !cancelado && setErro(e.message || "Erro ao carregar resultado."))
      .finally(() => !cancelado && setLoading(false));
    return () => { cancelado = true; };
  }, [codigo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="font-heading text-lg font-semibold">Resultado não disponível</h1>
          <p className="text-sm text-muted-foreground">{erro}</p>
        </div>
      </div>
    );
  }

  const licitacoes = resultado?.licitacoes || [];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Cabeçalho */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Gestor de Licitações IBGS</span>
          </div>
          <h1 className="font-heading text-xl font-semibold">Resultados compartilhados</h1>
          {resultado?.busca_nome && (
            <p className="text-sm opacity-80 mt-0.5">Busca: {resultado.busca_nome}</p>
          )}
          <p className="text-sm opacity-80 mt-2">
            {licitacoes.length} licitação(ões) encontrada(s)
          </p>
        </div>
      </header>

      {/* Lista de licitações */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {licitacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhuma licitação neste lote.
          </p>
        ) : (
          licitacoes.map((l, i) => {
            const local = [l.uf, l.municipio].filter(Boolean).join(" - ");
            const link = l.link_externo || l.link || "";
            return (
              <div key={i} className="bg-card border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-heading text-sm font-semibold leading-snug">
                    {i + 1}. {l.titulo}
                  </h2>
                </div>
                {l.objeto && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{l.objeto}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {l.orgao && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {l.orgao}
                    </span>
                  )}
                  {local && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {local}
                    </span>
                  )}
                  {l.abertura && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {l.abertura}
                    </span>
                  )}
                  {l.tipo && <span className="inline-flex items-center gap-1">· {l.tipo}</span>}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-medium">{formatValor(l.valor)}</span>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      Ver no portal oficial <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}

        <footer className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Resultado compartilhado via Gestor de Licitações IBGS
          </p>
        </footer>
      </main>
    </div>
  );
}