import { useState, useEffect } from "react";
import { UFS, MODALIDADES } from "@/shared/alertaApi";

export default function BuscaForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    nome: "",
    uf: "",
    palavra_chave: "",
    modalidade: "",
    municipio_ibge: "",
    licitacoes_por_pagina: 50,
    ativa: true,
  });

  useEffect(() => {
    if (initial) setForm({ ...form, ...initial });
  }, [initial]);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const submit = () => {
    if (!form.nome.trim()) return;
    onSave(form);
  };

  return (
    <div className="bg-card border rounded-lg p-5 space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Nome da busca *</label>
        <input
          value={form.nome}
          onChange={(e) => set("nome", e.target.value)}
          placeholder="Ex: Engenharia civil - PR"
          className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Estado (UF)</label>
          <input
            list="uf-list"
            value={form.uf || ""}
            onChange={(e) => set("uf", e.target.value.toUpperCase())}
            placeholder="Ex: PR,SC"
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <datalist id="uf-list">
            {UFS.map((uf) => (
              <option key={uf} value={uf} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Palavras-chave</label>
          <input
            value={form.palavra_chave || ""}
            onChange={(e) => set("palavra_chave", e.target.value)}
            placeholder="Ex: engenharia, -limpeza"
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Modalidade</label>
          <select
            value={form.modalidade || ""}
            onChange={(e) => set("modalidade", e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas</option>
            {MODALIDADES.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Código IBGE</label>
          <input
            value={form.municipio_ibge || ""}
            onChange={(e) => set("municipio_ibge", e.target.value)}
            placeholder="7 dígitos"
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.ativa}
          onChange={(e) => set("ativa", e.target.checked)}
          className="w-4 h-4"
        />
        Busca ativa (aparece para sincronização)
      </label>
      <div className="flex gap-2 pt-2">
        <button onClick={submit} className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90">
          Salvar busca
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2 text-sm border rounded-md hover:bg-muted">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}