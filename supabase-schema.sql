-- কোচিং প্রো — Supabase স্কিমা (Supabase Dashboard → SQL Editor-এ পেস্ট করে Run করুন)
-- সাদামাটা রিলেশনাল ডিজাইন: পরে MySQL/অন্য ডেটাবেজে নেওয়া সহজ হবে।

create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  address text default '',
  created_at timestamptz default now()
);

-- লগইন করা ইউজার কোন কোচিংয়ের
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  role text not null default 'admin'
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, subject text default '', phone text default '', salary numeric default 0
);
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, cls text default '', teacher_id uuid references teachers(id) on delete set null,
  schedule text default '', fee numeric default 0
);
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, roll int default 0, batch_id uuid references batches(id) on delete set null,
  phone text default '', guardian text default '', fee numeric default 0, joined date default current_date
);
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  month text not null, amount numeric not null, paid_on date default current_date
);
create table if not exists attendance (
  org_id uuid not null references orgs(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  day date not null, status text not null check (status in ('P','A','L')),
  primary key (student_id, day)
);
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, batch_id uuid references batches(id) on delete set null,
  day date default current_date, total numeric default 100
);
create table if not exists exam_marks (
  org_id uuid not null references orgs(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  marks numeric not null, primary key (exam_id, student_id)
);
create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  title text not null, body text default '', day date default current_date
);

-- নিরাপত্তা (RLS): প্রতিটা ইউজার শুধু নিজের কোচিংয়ের ডেটা দেখবে
create or replace function my_org() returns uuid language sql stable security definer set search_path = public as
$$ select org_id from profiles where user_id = auth.uid() $$;

do $$ declare t text; begin
  foreach t in array array['teachers','batches','students','payments','attendance','exams','exam_marks','notices'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists org_all on %I', t);
    execute format('create policy org_all on %I for all using (org_id = my_org()) with check (org_id = my_org())', t);
  end loop;
end $$;

alter table orgs enable row level security;
drop policy if exists org_read on orgs;
create policy org_read on orgs for select using (id = my_org());
drop policy if exists org_upd on orgs;
create policy org_upd on orgs for update using (id = my_org());
alter table profiles enable row level security;
drop policy if exists prof_read on profiles;
create policy prof_read on profiles for select using (user_id = auth.uid());

-- নতুন সাইন-আপে স্বয়ংক্রিয়ভাবে নিজের কোচিং তৈরি হবে
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  insert into orgs(name) values (coalesce(new.raw_user_meta_data->>'coaching_name','আমার কোচিং')) returning id into oid;
  insert into profiles(user_id, org_id, role) values (new.id, oid, 'admin');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
