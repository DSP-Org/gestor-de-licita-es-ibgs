import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UFS, MODALIDADES } from "@/shared/alertaApi";
import { Mail, Users, Loader2 } from "lucide-react";
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
    destinatarios_extras: [],
    telegram_chats: "",
  });
  const [municipios, setMunicipios] = useState([]);
  const [carregandoMun, setCarregandoMun] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [carregandoUsers, setCarregandoUsers] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (initial) setForm((f) => ({ ...f, ...initial, destinatarios_email: initial.destinatarios_email || [], destinatarios_extras: initial.destinatarios_extras || [], telegram_chats: initial.telegram_chats || "" }));
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

  const adicionarEmail = () => {
    const email = novoEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setForm((f) => ({ ...f, destinatarios_extras: [...(f.destinatarios_extras || []), email] }));
    setNovoEmail("");
  };

  const removerEmail = (index) => {
    setForm((f) => ({ ...f, destinatarios_extras: (f.destinatarios_extras || []).filter((_, i) => i !== index) }));
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> Destinatários do e-mail (selecione um ou mais)
              </label>
              {usuarios.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => set("destinatarios_email", usuarios.map((u) => u.id))} className="text-primary hover:underline">
                    Selecionar todos
                  </button>
                  <button type="button" onClick={() => set("destinatarios_email", [])} className="text-muted-foreground hover:underline">
                    Limpar
                  </button>
                </div>
              )}
            </div>
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

        {form.notificar_email && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Outros destinatários (e-mails externos)</label>
            <div className="mt-1 flex gap-2">
              <input
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarEmail(); } }}
              />
              <button type="button" onClick={adicionarEmail} className="px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90">
                Adicionar
              </button>
            </div>
            {(form.destinatarios_extras || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.destinatarios_extras || []).map((email, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs">
                    {email}
                    <button type="button" onClick={() => removerEmail(i)} className="text-muted-foreground hover:text-red-600">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

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