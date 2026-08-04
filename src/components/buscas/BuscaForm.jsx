import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UFS, MODALIDADES } from "@/shared/alertaApi";
import { Mail, Send, Users, Loader2 } from "lucide-react";
import PalavrasChaveInput from "./PalavrasChaveInput";

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
    telegram_chats: "",
  });
  const [municipios, setMunicipios] = useState([]);
  const [carregandoMun, setCarregandoMun] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [carregandoUsers, setCarregandoUsers] = useState(false);

  useEffect(() => {
    if (initial) setForm((f) => ({ ...f, ...initial, destinatarios_email: initial.destinatarios_email || [], telegram_chats: initial.telegram_chats || "" }));
  }, [initial]);

  useEffect(() => {
    let cancelado = false;
    setCarregandoUsers(true);
    base44.entities.User.list("-created_date", 200)
      .then((lista) => !cancelado && setUsuarios(Array.isArray(lista) ? lista : []))
      .catch(() => !cancelado && setUsuarios([]))
      .finally(() => !cancelado && setCarregandoUsers(false));
    return () => { cancelado = true; };
  }, []);

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

  const toggleDestinatario = (userId) => {
    setForm((f) => {
      const atual = f.destinatarios_email || [];
      const existe = atual.includes(userId);
      return { ...f, destinatarios_email: existe ? atual.filter((id) => id !== userId) : [...atual, userId] };
    });
  };

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

      {/* Notificações */}
      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-heading font-semibold flex items-center gap-1.5">
          <Mail className="w-4 h-4" /> Notificações
        </h3>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.notificar_email}
            onChange={(e) => set("notificar_email", e.target.checked)}
            className="w-4 h-4"
          />
          Enviar e-mail ao encontrar novas licitações
        </label>

        {form.notificar_email && (
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Destinatários do e-mail (usuários cadastrados)
            </label>
            {carregandoUsers ? (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Carregando usuários...</p>
            ) : usuarios.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">Nenhum usuário cadastrado. O e-mail será enviado ao dono da busca.</p>
            ) : (
              <div className="mt-1 max-h-32 overflow-auto border rounded-md p-2 space-y-1">
                {usuarios.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-muted rounded px-1">
                    <input
                      type="checkbox"
                      checked={(form.destinatarios_email || []).includes(u.id)}
                      onChange={() => toggleDestinatario(u.id)}
                      className="w-4 h-4"
                    />
                    <span className="min-w-0 truncate">{u.full_name || u.email}</span>
                    {u.email && <span className="text-xs text-muted-foreground truncate">· {u.email}</span>}
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {(form.destinatarios_email || []).length} selecionado(s). Se nenhum for escolhido, avisa o dono da busca.
            </p>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Send className="w-3 h-3" /> Telegram — IDs de chat (separados por vírgula)
          </label>
          <input
            value={form.telegram_chats || ""}
            onChange={(e) => set("telegram_chats", e.target.value)}
            placeholder="Ex: 123456789, -1009876543"
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Para descobrir seu chat ID, envie uma mensagem ao bot e acesse <code>api.telegram.org/bot&lt;token&gt;/getUpdates</code>.
          </p>
        </div>
      </div>

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