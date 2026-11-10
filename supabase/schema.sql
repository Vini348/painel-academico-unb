-- =====================================================================
-- Painel Acadêmico UnB — banco de dados (PostgreSQL / Supabase)
-- Cole TUDO no SQL Editor do Supabase e clique em "Run".
-- Cada linha pertence a um usuário logado e só ele enxerga/edita (RLS).
-- O painel conversa com o banco por duas funções: sync_push e sync_pull.
-- =====================================================================

create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  scope text not null default '',                 -- "Calcular por": '', curso ou 'sel'
  integ jsonb not null default '{}',              -- metas e horas manuais da integralização
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists courses (
  user_id uuid not null references auth.users on delete cascade,
  id bigint not null,                              -- id usado pelo painel
  code text not null,                              -- ex.: ECO0019
  name text not null,
  course text not null,                            -- Engenharia Elétrica / Educação Física
  type text not null check (type in ('Obrigatória','Optativa obrigatória','Optativa','Estágio/TCC','Módulo livre')),
  semester int not null default 0 check (semester between 0 and 20),
  credits int not null default 0 check (credits >= 0),
  class_hours int not null default 0 check (class_hours >= 0),
  difficulty int not null default 3 check (difficulty between 1 and 5),
  status text not null default 'Não cursada' check (status in ('Não cursada','Em andamento','Aprovada','Reprovada','Trancada','Dispensada','Aproveitada')),
  mention text check (mention in ('SS','MS','MM','MI','II','SR')),
  fails text[] not null default '{}',              -- menções das reprovações anteriores; '' = não informada
  term text check (term ~ '^[0-9]{4}\.[1-4]$'),    -- período cursado, ex.: 2025.1
  prereq text[] not null default '{}',
  notes text not null default '',
  study_hours numeric,
  selected_for_plan boolean not null default false,
  schedule text not null default '',               -- horário SIGAA, ex.: 35T23
  absences int not null default 0 check (absences >= 0),
  hours_per_class int not null default 2 check (hours_per_class between 1 and 4),
  grade_scale int not null default 10 check (grade_scale in (10,100)),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists grade_categories (
  user_id uuid not null,
  course_id bigint not null,
  name text not null,                              -- Provas, Listas, Trabalhos…
  pos int not null default 0,
  enabled boolean not null default true,
  qty int not null default 1 check (qty between 1 and 20),
  weight numeric not null default 0 check (weight >= 0),
  primary key (user_id, course_id, name),
  foreign key (user_id, course_id) references courses (user_id, id) on delete cascade
);

create table if not exists assessments (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  course_id bigint not null,
  pos int not null default 0,
  category text not null,
  name text not null,                              -- P1, L2…
  weight numeric not null default 0 check (weight >= 0),
  grade numeric check (grade >= 0),                -- null = ainda não feita
  due_date date,
  foreign key (user_id, course_id) references courses (user_id, id) on delete cascade
);

create table if not exists events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  due_date date not null,
  course_code text,
  type text not null default 'Outro'
);

create index if not exists courses_status_idx on courses (user_id, status);
create index if not exists assessments_course_idx on assessments (user_id, course_id);
create index if not exists events_due_idx on events (user_id, due_date);

-- ---------- Segurança: cada usuário só acessa as próprias linhas ----------
alter table profiles enable row level security;
alter table courses enable row level security;
alter table grade_categories enable row level security;
alter table assessments enable row level security;
alter table events enable row level security;

drop policy if exists proprio on profiles;
drop policy if exists proprio on courses;
drop policy if exists proprio on grade_categories;
drop policy if exists proprio on assessments;
drop policy if exists proprio on events;
create policy proprio on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy proprio on courses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy proprio on grade_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy proprio on assessments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy proprio on events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Tabela do "despertador" (evita a pausa do plano gratuito) ----------
create table if not exists keepalive (id int primary key);
insert into keepalive values (1) on conflict do nothing;
alter table keepalive enable row level security;
drop policy if exists leitura on keepalive;
create policy leitura on keepalive for select using (true);

-- ---------- Enviar tudo de uma vez (transação única) ----------
create or replace function sync_push(p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'não autenticado'; end if;

  insert into profiles (user_id, scope, integ, synced_at)
  values (uid, coalesce(p->>'scope',''), coalesce(p->'integ','{}'::jsonb), now())
  on conflict (user_id) do update set scope = excluded.scope, integ = excluded.integ, synced_at = now();

  delete from events where user_id = uid;
  delete from assessments where user_id = uid;
  delete from grade_categories where user_id = uid;
  delete from courses where user_id = uid
    and id not in (select (x->>'id')::bigint from jsonb_array_elements(coalesce(p->'courses','[]'::jsonb)) x);

  insert into courses (user_id, id, code, name, course, type, semester, credits, class_hours, difficulty, status,
                       mention, fails, term, prereq, notes, study_hours, selected_for_plan, schedule, absences,
                       hours_per_class, grade_scale, updated_at)
  select uid, (x->>'id')::bigint, x->>'code', x->>'name', x->>'course', x->>'type',
         least(20, greatest(0, coalesce((x->>'semester')::int, 0))),
         greatest(0, coalesce((x->>'credits')::numeric, 0))::int,
         greatest(0, coalesce((x->>'classHours')::numeric, 0))::int,
         least(5, greatest(1, coalesce((x->>'difficulty')::int, 3))),
         coalesce(x->>'status', 'Não cursada'),
         nullif(x->>'mention', ''),
         coalesce(array(select jsonb_array_elements_text(coalesce(x->'fails','[]'::jsonb))), '{}'),
         nullif(x->>'term', ''),
         coalesce(array(select jsonb_array_elements_text(coalesce(x->'prereq','[]'::jsonb))), '{}'),
         coalesce(x->>'notes', ''),
         nullif(x->>'studyHours', '')::numeric,
         coalesce((x->>'selectedForPlan')::boolean, false),
         coalesce(x->>'schedule', ''),
         greatest(0, coalesce((x->>'abs')::int, 0)),
         least(4, greatest(1, coalesce((x->>'hpa')::int, 2))),
         case when (x->>'gradeScale') = '100' then 100 else 10 end,
         now()
  from jsonb_array_elements(coalesce(p->'courses','[]'::jsonb)) x
  on conflict (user_id, id) do update set
    code = excluded.code, name = excluded.name, course = excluded.course, type = excluded.type,
    semester = excluded.semester, credits = excluded.credits, class_hours = excluded.class_hours,
    difficulty = excluded.difficulty, status = excluded.status, mention = excluded.mention,
    fails = excluded.fails, term = excluded.term, prereq = excluded.prereq, notes = excluded.notes,
    study_hours = excluded.study_hours, selected_for_plan = excluded.selected_for_plan,
    schedule = excluded.schedule, absences = excluded.absences, hours_per_class = excluded.hours_per_class,
    grade_scale = excluded.grade_scale, updated_at = now();

  insert into grade_categories (user_id, course_id, name, pos, enabled, qty, weight)
  select uid, (x->>'id')::bigint, g.v->>'name', g.n::int,
         coalesce((g.v->>'on')::boolean, true),
         least(20, greatest(1, coalesce((g.v->>'count')::int, 1))),
         greatest(0, coalesce((g.v->>'weight')::numeric, 0))
  from jsonb_array_elements(coalesce(p->'courses','[]'::jsonb)) x,
       jsonb_array_elements(coalesce(x->'gradeCats','[]'::jsonb)) with ordinality as g(v, n)
  on conflict do nothing;

  insert into assessments (user_id, course_id, pos, category, name, weight, grade, due_date)
  select uid, (x->>'id')::bigint, a.n::int, coalesce(a.v->>'cat', 'Outras'), coalesce(a.v->>'name', ''),
         greatest(0, coalesce((a.v->>'weight')::numeric, 0)),
         nullif(a.v->>'grade', '')::numeric,
         nullif(a.v->>'date', '')::date
  from jsonb_array_elements(coalesce(p->'courses','[]'::jsonb)) x,
       jsonb_array_elements(coalesce(x->'assessments','[]'::jsonb)) with ordinality as a(v, n);

  insert into events (user_id, title, due_date, course_code, type)
  select uid, e->>'title', (e->>'date')::date, nullif(e->>'code', ''), coalesce(e->>'type', 'Outro')
  from jsonb_array_elements(coalesce(p->'events','[]'::jsonb)) e;
end $$;

-- ---------- Baixar tudo de uma vez ----------
create or replace function sync_pull() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'scope',  coalesce((select scope from profiles where user_id = auth.uid()), ''),
    'integ',  coalesce((select integ from profiles where user_id = auth.uid()), '{}'::jsonb),
    'synced_at', (select synced_at from profiles where user_id = auth.uid()),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'code', c.code, 'name', c.name, 'course', c.course, 'type', c.type,
        'semester', c.semester, 'credits', c.credits, 'classHours', c.class_hours,
        'difficulty', c.difficulty, 'status', c.status, 'mention', coalesce(c.mention, ''),
        'fails', to_jsonb(c.fails), 'term', coalesce(c.term, ''), 'prereq', to_jsonb(c.prereq),
        'notes', c.notes, 'studyHours', c.study_hours, 'selectedForPlan', c.selected_for_plan,
        'schedule', c.schedule, 'abs', c.absences, 'hpa', c.hours_per_class, 'gradeScale', c.grade_scale,
        'gradeCats', coalesce((select jsonb_agg(jsonb_build_object('name', g.name, 'on', g.enabled, 'count', g.qty, 'weight', g.weight) order by g.pos)
                               from grade_categories g where g.user_id = c.user_id and g.course_id = c.id), '[]'::jsonb),
        'assessments', coalesce((select jsonb_agg(jsonb_build_object('cat', a.category, 'name', a.name, 'weight', a.weight, 'grade', a.grade, 'date', coalesce(a.due_date::text, '')) order by a.pos)
                                 from assessments a where a.user_id = c.user_id and a.course_id = c.id), '[]'::jsonb)
      ) order by c.id) from courses c where c.user_id = auth.uid()), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('title', e.title, 'date', e.due_date::text, 'code', coalesce(e.course_code, ''), 'type', e.type) order by e.due_date, e.id)
      from events e where e.user_id = auth.uid()), '[]'::jsonb)
  )
$$;

revoke all on function sync_push(jsonb) from public, anon;
revoke all on function sync_pull() from public, anon;
grant execute on function sync_push(jsonb) to authenticated;
grant execute on function sync_pull() to authenticated;
