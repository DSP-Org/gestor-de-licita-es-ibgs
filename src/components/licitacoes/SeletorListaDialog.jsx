import { useState } from "react";
import { X, Folder, Plus, Loader2, Star } from "lucide-react";

// Escolha da lista ao favoritar. Recebe as listas já carregadas pelo pai e
// devolve o id escolhido — string vazia significa favoritar sem vincular.
export default function SeletorListaDialog({
  quantidade = 1,
  listas = [],
  onConfirm,
  onCriarLista,
  onClose,
}) {
  const [selecionada, setSelecionada] = useState("");
  const [criando, setCriando] = useState(false);
  const [nomeNova, setNomeNova] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const confirmar = async () => {
    setSalvando(true);
    setErro("");
    try {
      await onConfirm(selecionada);
    } catch (e) {
      setErro(e?.message || "Não foi possível favoritar.");
      setSalvando(false);
    }
  };

  const criar = async () => {
    const nome = nomeNova.trim();
    if (!nome) return;
    setSalvando(true);
    setErro("");
    try {
      const nova = await onCriarLista(nome);
      if (nova?.id) setSelecionada(nova.id);
      setNomeNova("");
      setCriando(false);
    } catch (e) {
      setErro(e?.message || "Não foi possível criar a lista.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between">
          <h2 className="font-heading font-semibold flex items-center gap-2">
            <Star className="w-4 h-4" /> Favoritar
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            {quantidade === 1
              ? "Escolha a lista onde esta licitação será organizada."
              : `Escolha a lista para as ${quantidade} licitações selecionadas.`}
          </p>

          <div className="space-y-1.5 max-h-64 overflow-auto">
            <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer hover:bg-muted">
              <input
                type="radio"
                name="lista"
                checked={selecionada === ""}
                onChange={() => setSelecionada("")}
                className="w-4 h-4"
              />
              <span className="text-sm">Sem lista</span>
              <span className="text-xs text-muted-foreground ml-auto">só favoritar</span>
            </label>

            {listas.map((l) => (
              <label
                key={l.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer hover:bg-muted"
              >
                <input
                  type="radio"
                  name="lista"
                  checked={selecionada === l.id}
                  onChange={() => setSelecionada(l.id)}
                  className="w-4 h-4"
                />
                <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm min-w-0 truncate">{l.nome}</span>
              </label>
            ))}
          </div>

          {criando ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={nomeNova}
                onChange={(e) => setNomeNova(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") criar();
                  if (e.key === "Escape") setCriando(false);
                }}
                placeholder="Nome da nova lista"
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={criar}
                disabled={salvando || !nomeNova.trim()}
                className="px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCriando(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Nova lista
            </button>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm border rounded-md hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={salvando}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              Favoritar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
