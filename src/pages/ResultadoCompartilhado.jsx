import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell, ExternalLink, Loader2, MapPin, Building2, Calendar, AlertCircle, Download, Check } from "lucide-react";
import { formatValor } from "@/components/licitacoes/LicitacaoCard";

export default function ResultadoCompartilhado() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [importando, setImportando] = useState(false);
  const [importado, setImportado] = useState(false);
  const [msgImport, setMsgImport] = useState("");

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

  const importarParaMinhas = async () => {
    setImportando(true);
    setMsgImport("");
    try {
      const autenticado = await base44.auth.isAuthenticated().catch(() => false);
      if (!autenticado) {
        navigate(`/login?returnTo=${encodeURIComponent(`/compartilhar/${codigo}`)}`);
        return;
      }
      // Evita duplicar licitações já salvas pelo usuário
      const minhas = await base44.entities.Licitacao.list("-updated_date", 500);
      const existIds = new Set(minhas.map((l) => l.id_licitacao));
      const novas = licitacoes
        .filter((l) => !existIds.has(l.id_licitacao))
        .map((l) => ({
          id_licitacao: l.id_licitacao,
          titulo: l.titulo,
          objeto: l.objeto,
          uf: l.uf,
          municipio: l.municipio,
          municipio_ibge: l.municipio_ibge,
          orgao: l.orgao,
          abertura: l.abertura,
          tipo: l.tipo,
          valor: l.valor,
          link: l.link,
          link_externo: l.link_externo,
          status: "interessado",
          favorito: false,
          busca_origem: resultado?.busca_nome || "compartilhado",
        }));
      if (novas.length === 0) {
        setImportado(true);
        setMsgImport("Todas as licitações já estão na sua lista.");
        return;
      }
      await base44.entities.Licitacao.bulkCreate(novas);
      setImportado(true);
      setMsgImport(`${novas.length} licitação(ões) importada(s) para "Minhas licitações".`);
    } catch (e) {
      setMsgImport(e.message || "Erro ao importar. Faça login para usar esta função.");
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Cabeçalho */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Licitalerta360</span>
          </div>
          <h1 className="font-heading text-lg sm:text-xl font-semibold">Resultados compartilhados</h1>
          {resultado?.busca_nome && (
            <p className="text-sm opacity-80 mt-0.5">Busca: {resultado.busca_nome}</p>
          )}
          <p className="text-sm opacity-80 mt-2">
            {licitacoes.length} licitação(ões) encontrada(s)
          </p>
          <button
            onClick={importarParaMinhas}
            disabled={importando || importado || licitacoes.length === 0}
            className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-primary text-sm font-semibold rounded-md hover:bg-white/90 disabled:opacity-60"
          >
            {importando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : importado ? (
              <Check className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {importado ? "Importado" : "Importar para minhas licitações"}
          </button>
          {msgImport && (
            <p className="mt-2 text-xs bg-white/10 rounded px-2 py-1 inline-block">{msgImport}</p>
          )}
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
            const link = l.link_externo || "";
            return (
              <div key={i} className="bg-card border rounded-lg p-3.5 space-y-2">
                <h2 className="font-heading text-sm font-semibold leading-snug">
                  {i + 1}. {l.titulo}
                </h2>
                {l.objeto && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{l.objeto}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
                      Ver portal <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}

        <footer className="pt-4 text-center space-y-0.5">
          <p className="text-xs text-muted-foreground">
            Resultado compartilhado via Licitalerta360
          </p>
          <p className="text-xs font-medium text-foreground/70">
            Desenvolvido por Data5 Tecnologia — Todos os direitos reservados © {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}