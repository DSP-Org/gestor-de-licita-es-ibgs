-- Estrutura inicial do Gestor de Licitações IBGS em Postgres/Supabase.
-- Espelha as entidades declarativas do Base44 (base44/entities/*.jsonc) e
-- traduz o RLS declarativo de lá para RLS nativo do Postgres.
-- Sem migração de dado nenhum aqui — só estrutura e regras (decisão explícita:
-- os dados de sincronização voltam pela API; só estrutura/regras importam agora).

-- ============================================================================
-- EXTENSÕES
-- ============================================================================
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ============================================================================
-- TIPOS (enums) — mesmos valores dos enums do Base44
-- ============================================================================
create type public.user_role as enum ('admin', 'user');
create type public.user_approval_status as enum ('pending', 'approved', 'rejected');
create type public.busca_modo_palavras as enum ('qualquer', 'todas');
create type public.licitacao_status as enum (
  'interessado', 'acompanhando', 'participando', 'vencida', 'ganha', 'perdida', 'descartada'
);
create type public.licitacao_status_leitura as enum ('nova', 'vista', 'lida');

-- ============================================================================
-- FUNÇÃO utilitária de updated_at (Base44 mantém created_date/updated_date
-- automaticamente; em Postgres isso precisa de trigger explícito)
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- UNIDADE DE NEGÓCIO (multi-tenant)
-- Só o master cria/edita/apaga (RLS abaixo). Leitura aberta a qualquer
-- usuário autenticado — precisa listar as unidades pra montar o seletor.
-- ============================================================================
create table public.unidade_negocio (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_unidade_negocio_updated_at
  before update on public.unidade_negocio
  for each row execute function public.set_updated_at();

-- ============================================================================
-- PROFILES (equivalente ao User do Base44)
-- 1:1 com auth.users. Criado automaticamente por trigger no signup (abaixo),
-- não por insert direto do cliente — por isso não há policy de INSERT aqui.
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'user',
  approval_status public.user_approval_status not null default 'pending',
  -- Unidade ATIVA no momento — é o campo que o RLS das entidades "com dono" compara.
  unidade_negocio_id uuid references public.unidade_negocio (id) on delete set null,
  -- Unidades às quais o usuário pode pertencer/alternar.
  unidades_negocio_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Regra que hoje só é garantida pela função trocarUnidadeAtiva (aplicação);
  -- aqui vira invariante de banco: a unidade ativa tem que estar entre as permitidas.
  constraint unidade_ativa_precisa_estar_na_lista
    check (unidade_negocio_id is null or unidade_negocio_id = any (unidades_negocio_ids))
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o profile automaticamente quando um usuário se cadastra (equivalente ao
-- auto-registro de User no Base44). approval_status nasce 'pending' — precisa
-- de aprovação do admin, igual hoje.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Funções auxiliares de RLS (equivalentes ao {{user.data.campo}} do Base44)
-- ----------------------------------------------------------------------------
create or replace function public.current_unidade_id()
returns uuid language sql stable as $$
  select unidade_negocio_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Master hardcoded, igual ao Base44 hoje (nailton.alsampaio@gmail.com em
-- várias regras RLS). Mantido como função única para trocar em um lugar só.
create or replace function public.is_master()
returns boolean language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'nailton.alsampaio@gmail.com';
$$;

alter table public.unidade_negocio enable row level security;
alter table public.profiles enable row level security;

create policy "unidade_negocio: leitura aberta a autenticados"
  on public.unidade_negocio for select
  to authenticated
  using (true);

create policy "unidade_negocio: só master escreve"
  on public.unidade_negocio for all
  to authenticated
  using (public.is_master())
  with check (public.is_master());

create policy "profiles: leitura aberta a autenticados"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: só master atualiza"
  on public.profiles for update
  to authenticated
  using (public.is_master())
  with check (public.is_master());

-- ============================================================================
-- FAVORITA_LISTA
-- Criada antes de LICITACAO porque licitacao.lista_favorita_id referencia esta tabela.
-- ============================================================================
create table public.favorita_lista (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  cor text not null default 'blue',
  ordem integer not null default 0,
  usuario_id uuid references public.profiles (id) on delete set null,
  unidade_negocio_id uuid not null references public.unidade_negocio (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_favorita_lista_unidade on public.favorita_lista (unidade_negocio_id);

create trigger trg_favorita_lista_updated_at
  before update on public.favorita_lista
  for each row execute function public.set_updated_at();

alter table public.favorita_lista enable row level security;

create policy "favorita_lista: por unidade ou master"
  on public.favorita_lista for all
  to authenticated
  using (unidade_negocio_id = public.current_unidade_id() or public.is_master())
  with check (unidade_negocio_id = public.current_unidade_id() or public.is_master());

-- ============================================================================
-- LICITACAO
-- ============================================================================
create table public.licitacao (
  id uuid primary key default gen_random_uuid(),
  id_licitacao text not null,
  titulo text not null,
  objeto text,
  uf text,
  municipio text,
  municipio_ibge text,
  orgao text,
  abertura_datetime timestamptz,
  abertura text,
  tipo text,
  id_tipo text,
  valor text,
  link text,
  link_externo text,
  status public.licitacao_status not null default 'interessado',
  favorito boolean not null default false,
  salva_manualmente boolean not null default false,
  notas text,
  valor_proposta numeric,
  busca_origem text,
  -- Legado/informativo — não controla acesso (isso é unidade_negocio_id).
  usuario_id uuid references public.profiles (id) on delete set null,
  unidade_negocio_id uuid not null references public.unidade_negocio (id) on delete restrict,
  lista_favorita_id uuid references public.favorita_lista (id) on delete set null,
  data_sincronizacao date,
  data_publicacao date,
  oculto boolean not null default false,
  status_leitura public.licitacao_status_leitura not null default 'nova',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Invariante que hoje só a lógica de dedupe do sincronizarBuscas garante na
  -- aplicação; aqui vira restrição de banco (impede duplicata mesmo se algum
  -- código futuro pular o filtro de dedupe).
  constraint licitacao_unica_por_unidade unique (unidade_negocio_id, id_licitacao)
);

create index idx_licitacao_unidade on public.licitacao (unidade_negocio_id);
create index idx_licitacao_lista_favorita on public.licitacao (lista_favorita_id);

create trigger trg_licitacao_updated_at
  before update on public.licitacao
  for each row execute function public.set_updated_at();

alter table public.licitacao enable row level security;

create policy "licitacao: por unidade ou master"
  on public.licitacao for all
  to authenticated
  using (unidade_negocio_id = public.current_unidade_id() or public.is_master())
  with check (unidade_negocio_id = public.current_unidade_id() or public.is_master());

-- ============================================================================
-- BUSCA_SALVA
-- ============================================================================
create table public.busca_salva (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  uf text,
  palavra_chave text,
  modo_palavras public.busca_modo_palavras not null default 'qualquer',
  modalidade text,
  municipio_nome text,
  municipio_ibge text,
  licitacoes_por_pagina integer not null default 50,
  ativa boolean not null default true,
  horario_sincronizacao text not null default '09:00',
  notificar_email boolean not null default true,
  destinatarios_email text[] not null default '{}',
  destinatarios_extras text[] not null default '{}',
  telegram_chats text,
  ultima_sincronizacao timestamptz,
  total_encontrado integer,
  usuario_id uuid references public.profiles (id) on delete set null,
  unidade_negocio_id uuid not null references public.unidade_negocio (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_busca_salva_unidade on public.busca_salva (unidade_negocio_id);

create trigger trg_busca_salva_updated_at
  before update on public.busca_salva
  for each row execute function public.set_updated_at();

alter table public.busca_salva enable row level security;

create policy "busca_salva: por unidade ou master"
  on public.busca_salva for all
  to authenticated
  using (unidade_negocio_id = public.current_unidade_id() or public.is_master())
  with check (unidade_negocio_id = public.current_unidade_id() or public.is_master());

-- ============================================================================
-- DESTINATARIO
-- Nota: no Base44 este é o único das 4 entidades "com dono" cujo bypass é
-- "qualquer admin" (user_condition role=admin), não "só o master" como as
-- outras três. Mantido assim de propósito para espelhar o comportamento atual
-- — mas é uma inconsistência que vale revisar (um admin de uma unidade hoje
-- pode ler/editar destinatários de TODAS as unidades, diferente de Licitacao/
-- BuscaSalva/FavoritaLista onde só o master tem esse alcance).
-- ============================================================================
create table public.destinatario (
  id uuid primary key default gen_random_uuid(),
  nome text,
  email text not null,
  observacao text,
  usuario_id uuid references public.profiles (id) on delete set null,
  unidade_negocio_id uuid not null references public.unidade_negocio (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_destinatario_unidade on public.destinatario (unidade_negocio_id);

create trigger trg_destinatario_updated_at
  before update on public.destinatario
  for each row execute function public.set_updated_at();

alter table public.destinatario enable row level security;

create policy "destinatario: por unidade ou admin"
  on public.destinatario for all
  to authenticated
  using (unidade_negocio_id = public.current_unidade_id() or public.is_admin())
  with check (unidade_negocio_id = public.current_unidade_id() or public.is_admin());

-- ============================================================================
-- CONSULTA_CACHE
-- Compartilhado entre todas as unidades (chave não inclui unidade_negocio_id
-- de propósito — é cache de resposta bruta da API, não dado de tenant).
-- Leitura aberta a todos; escrita só admin/service role.
-- ============================================================================
create table public.consulta_cache (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  uf text,
  palavra_chave text,
  modalidade text,
  municipio_ibge text,
  data_insercao text,
  pagina integer,
  resultado jsonb not null,
  expira_em timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.consulta_cache enable row level security;

create policy "consulta_cache: leitura aberta"
  on public.consulta_cache for select
  to authenticated
  using (true);

create policy "consulta_cache: escrita só admin"
  on public.consulta_cache for insert
  to authenticated
  with check (public.is_admin());

create policy "consulta_cache: update só admin"
  on public.consulta_cache for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "consulta_cache: delete só admin"
  on public.consulta_cache for delete
  to authenticated
  using (public.is_admin());

-- Nota: as funções de backend (sincronizarBuscas etc.) rodam com a service
-- role do Supabase, que ignora RLS por padrão — a policy "só admin" acima é
-- a barreira para escrita feita por um usuário comum autenticado direto.

-- ============================================================================
-- RESULTADO_COMPARTILHADO
-- Público por design (link /compartilhar/:codigo). O Base44 não define rls
-- pra essa entidade — assumindo aqui que só a service role cria (é sempre
-- criado dentro de sincronizarBuscas/salvarLicitacaoNoBanco, nunca pelo
-- usuário direto) e que a leitura é pública mesmo (sem exigir estar logado).
-- ============================================================================
create table public.resultado_compartilhado (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  busca_nome text,
  licitacoes jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.resultado_compartilhado enable row level security;

create policy "resultado_compartilhado: leitura pública"
  on public.resultado_compartilhado for select
  to anon, authenticated
  using (true);

-- Sem policy de insert/update/delete para anon/authenticated: só a service
-- role (que ignora RLS) cria esses registros, igual hoje.
