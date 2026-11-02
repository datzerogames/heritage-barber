-- =============================================================
--  Heritage Barber — banco de dados (Supabase)
--  Cole tudo no SQL Editor do Supabase e clique em "Run".
--  Pode rodar de novo sem perder dados (atualiza o que mudou).
-- =============================================================

-- Perfis (um por usuário do app): dono (admin), barbeiro ou cliente
create table if not exists public.perfis (
  id        uuid primary key references auth.users on delete cascade,
  nome      text not null default '',
  email     text,
  tel       text,
  tipo      text not null default 'cliente',
  barbeiro  text,                 -- nome do barbeiro, quando tipo = 'barbeiro'
  criado_em timestamptz not null default now()
);
alter table public.perfis add column if not exists barbeiro text;
alter table public.perfis drop constraint if exists perfis_tipo_check;
alter table public.perfis add constraint perfis_tipo_check check (tipo in ('cliente','barbeiro','admin'));

-- Equipe: o dono cadastra; quem tem email ganha login de barbeiro
create table if not exists public.barbeiros (
  id        bigint generated always as identity primary key,
  nome      text not null,
  email     text,
  tel       text,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index if not exists barbeiros_nome  on public.barbeiros (lower(nome));
create unique index if not exists barbeiros_email on public.barbeiros (lower(email)) where email is not null;

-- Agendamentos
create table if not exists public.agendamentos (
  id         bigint generated always as identity primary key,
  data       date not null,
  hora       text not null,
  barbeiro   text not null,
  cliente_id uuid references public.perfis(id) on delete set null,
  cliente    text not null,
  tel        text,
  servicos   text[] not null default '{}',
  servico    text,
  valor      numeric(10,2) not null default 0,
  status     text not null default 'confirmado'
             check (status in ('confirmado','pendente','cancelado','concluido')),
  criado_em  timestamptz not null default now()
);
-- Impede dois clientes no mesmo horário com o mesmo barbeiro
create unique index if not exists agendamentos_horario_unico
  on public.agendamentos (data, hora, barbeiro) where status <> 'cancelado';
create index if not exists agendamentos_data on public.agendamentos (data);

-- Recebimentos (caixa)
create table if not exists public.recebimentos (
  id             bigint generated always as identity primary key,
  agendamento_id bigint references public.agendamentos(id) on delete set null,
  data           date not null default current_date,
  hora           text,
  cliente        text,
  barbeiro       text,
  servico        text,
  valor          numeric(10,2) not null,
  metodo         text,
  criado_em      timestamptz not null default now()
);

-- ---------- Funções de apoio ----------
-- É o dono?
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and tipo = 'admin');
$$;

-- Nome do barbeiro logado (nulo para quem não é barbeiro)
create or replace function public.meu_barbeiro() returns text
language sql stable security definer set search_path = public as $$
  select barbeiro from public.perfis where id = auth.uid() and tipo = 'barbeiro';
$$;

-- Cria o perfil quando alguém se cadastra no app.
-- Se o email estiver na equipe, a conta já nasce como barbeiro.
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare b text;
begin
  select nome into b from public.barbeiros where lower(email) = lower(new.email) limit 1;
  insert into public.perfis (id, nome, email, tel, tipo, barbeiro)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'nome', ''), b, ''),
          new.email,
          new.raw_user_meta_data->>'tel',
          case when b is not null then 'barbeiro' else 'cliente' end,
          b);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.novo_usuario();

-- Mantém os logins em dia quando o dono adiciona/edita/remove um barbeiro
create or replace function public.sync_barbeiro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    update public.perfis set tipo = 'cliente', barbeiro = null
     where tipo = 'barbeiro' and barbeiro = old.nome;
  end if;
  if tg_op in ('INSERT','UPDATE') and new.email is not null and new.ativo then
    update public.perfis set tipo = 'barbeiro', barbeiro = new.nome
     where lower(email) = lower(new.email) and tipo <> 'admin';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists barbeiros_sync on public.barbeiros;
create trigger barbeiros_sync after insert or update or delete on public.barbeiros
  for each row execute function public.sync_barbeiro();

-- Lista da equipe para clientes e barbeiros (só nomes, sem emails)
create or replace function public.lista_barbeiros()
returns table (id bigint, nome text, ativo boolean)
language sql stable security definer set search_path = public as $$
  select id, nome, ativo from public.barbeiros where ativo order by nome;
$$;
grant execute on function public.lista_barbeiros() to authenticated;

-- Horários ocupados (sem nomes) para o cliente ver a disponibilidade
create or replace function public.horarios_ocupados(de date, ate date)
returns table (id bigint, data date, hora text, barbeiro text)
language sql stable security definer set search_path = public as $$
  select id, data, hora, barbeiro from public.agendamentos
  where status <> 'cancelado' and data between de and ate;
$$;
grant execute on function public.horarios_ocupados(date, date) to authenticated;

-- ---------- Segurança (RLS) ----------
alter table public.perfis       enable row level security;
alter table public.barbeiros    enable row level security;
alter table public.agendamentos enable row level security;
alter table public.recebimentos enable row level security;

-- Ninguém muda o próprio "tipo" nem o "barbeiro": só nome e telefone
revoke update on public.perfis from authenticated;
grant update (nome, tel) on public.perfis to authenticated;

drop policy if exists perfis_ler on public.perfis;
create policy perfis_ler on public.perfis for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists perfis_editar on public.perfis;
create policy perfis_editar on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Equipe: só o dono lê a ficha completa e mexe
drop policy if exists barbeiros_dono on public.barbeiros;
create policy barbeiros_dono on public.barbeiros for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Agendamentos: dono vê tudo; barbeiro vê e mexe só nos dele; cliente vê os próprios
drop policy if exists agd_ler on public.agendamentos;
create policy agd_ler on public.agendamentos for select to authenticated
  using (public.is_admin() or barbeiro = public.meu_barbeiro() or cliente_id = auth.uid());
drop policy if exists agd_criar on public.agendamentos;
create policy agd_criar on public.agendamentos for insert to authenticated
  with check (public.is_admin()
          or barbeiro = public.meu_barbeiro()
          or (cliente_id = auth.uid() and status = 'confirmado' and data >= current_date));
drop policy if exists agd_editar on public.agendamentos;
create policy agd_editar on public.agendamentos for update to authenticated
  using (public.is_admin() or barbeiro = public.meu_barbeiro())
  with check (public.is_admin() or barbeiro = public.meu_barbeiro());
drop policy if exists agd_apagar on public.agendamentos;
create policy agd_apagar on public.agendamentos for delete to authenticated
  using (public.is_admin() or barbeiro = public.meu_barbeiro());

-- Caixa: dono vê e mexe em tudo; barbeiro só registra e vê os recebimentos dele
drop policy if exists receb_admin on public.recebimentos;
create policy receb_admin on public.recebimentos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists receb_barbeiro_criar on public.recebimentos;
create policy receb_barbeiro_criar on public.recebimentos for insert to authenticated
  with check (barbeiro = public.meu_barbeiro());
drop policy if exists receb_barbeiro_ler on public.recebimentos;
create policy receb_barbeiro_ler on public.recebimentos for select to authenticated
  using (barbeiro = public.meu_barbeiro());

-- Tempo real: agendamento do cliente aparece na hora para o barbeiro e o dono
do $$ begin
  alter publication supabase_realtime add table public.agendamentos;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.recebimentos;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.barbeiros;
exception when duplicate_object then null; end $$;

-- =============================================================
--  DEPOIS de criar a sua conta no app, rode isto trocando o email
--  para virar o DONO (vê Painel, Agenda, Clientes, Caixa e Equipe):
--
--  update public.perfis set tipo = 'admin', barbeiro = null where email = 'seu@email.com';
--
--  Os barbeiros você adiciona pelo próprio app, na aba Equipe.
-- =============================================================
