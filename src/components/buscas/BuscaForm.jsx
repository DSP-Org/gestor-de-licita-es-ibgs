import { useState, useEffect } from "react";
import { MODALIDADES } from "@/shared/alertaApi";
import { Loader2 } from "lucide-react";
import PalavrasChaveInput from "./PalavrasChaveInput";
import UfMultiSelect from "./UfMultiSelect";

export default function BuscaForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    nome: "",
    uf: "",
    palavra_chave: "",
    modo_palavras: "qualquer",
    modalidade: "",
    municipio_nome: "",
    municipio_ibge: "",
    licitacoes_por_pagina: 50,
    ativa: true,
    notificar_email: true,
    destinatarios_email: [],
    destinatarios_extras: [],
    telegram_chats: "",
  });
  const [municipios, setMunicipios] = useState([]);
  const [carregandoMun, setCarregandoMun] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // destinatarios_email e destinatarios_extras não são editáveis aqui (isso é da aba
  // Alerta), mas seguem no estado para que salvar o filtro não apague o que foi
  // configurado lá.
  useEffect(() => {
    if (initial) setForm((f) => ({ ...f, ...initial, destinatarios_email: initial.destinatarios_email || [], destinatarios_extras: initial.destinatarios_extras || [], telegram_chats: initial.telegram_chats || "" }));
  }, [initial]);

  useEffect(() => {
    const uf = (form.uf || "").trim();
    if (!uf || uf.includes(",")) {
      setMunicipios([]);
      return;
    }
    let cancelado = false;
    setCarregandoMun(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      .then((r) => r.json())
      .then((lista) => !cancelado && setMunicipios(Array.isArray(lista) ? lista : []))
      .catch(() => !cancelado && setMunicipios([]))
      .finally(() => !cancelado && setCarregandoMun(false));
    return () => { cancelado = true; };
  }, [form.uf]);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const selecionarMunicipio = (nome) => {
    const mun = municipios.find((m) => m.nome === nome);
    if (mun) {
      setForm((f) => ({ ...f, municipio_nome: nome, municipio_ibge: String(mun.id) }));
    } else {
      set("municipio_nome", nome);
    }
  };

  const submit = async () => {
    if (!form.nome?.trim()) {
      setErro("Informe o nome da busca para salvar.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      const { id, created_date, updated_date, created_by_id, created_by, ...dados } = form;
      await onSave({
        ...dados,
        nome: dados.nome.trim(),
        licitacoes_por_pagina: Number(dados.licitacoes_por_pagina) || 50,
      });
    } catch (e) {
      setErro(e?.message || "Não foi possível salvar a busca.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 sm:p-5 space-y-4">
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
          <UfMultiSelect value={form.uf || ""} onChange={(v) => set("uf", v)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Município (por nome) {form.uf && !form.uf.includes(",") && !carregandoMun && `(${municipios.length})`}
          </label>
          <input
            list="mun-list"
            value={form.municipio_nome || ""}
            onChange={(e) => selecionarMunicipio(e.target.value)}
            disabled={!form.uf || form.uf.includes(",")}
            placeholder={form.uf && !form.uf.includes(",") ? "Selecione a cidade" : "Informe uma UF primeiro"}
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <datalist id="mun-list">
            {municipios.map((m) => (
              <option key={m.id} value={m.nome} />
            ))}
          </datalist>
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
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Palavras-chave</label>
          <PalavrasChaveInput
            value={form.palavra_chave || ""}
            onChange={(v) => set("palavra_chave", v)}
            modo={form.modo_palavras || "qualquer"}
            onChangeModo={(v) => set("modo_palavras", v)}
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

      {/* Notificações e destinatários ficam na aba Alerta — aqui só se configura o filtro. */}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          onClick={submit}
          disabled={salvando}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50 sm:order-2 sm:ml-auto"
        >
          {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar busca
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2.5 text-sm border rounded-md hover:bg-muted sm:order-1">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}