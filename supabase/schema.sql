-- WongaGo 데이터베이스 스키마
--
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 그대로 붙여넣고 실행하세요.
-- 여러 번 실행해도 안전합니다 (IF NOT EXISTS / DROP POLICY IF EXISTS).
--
-- 설계 원칙
--  * 모든 테이블은 소유자(user_id)를 갖고, RLS 로 남의 데이터가 절대 보이지 않게 막는다.
--  * 레시피 항목은 재료를 참조하되 가격을 함께 복사해 둔다.
--    재료가 삭제돼도 그 메뉴의 원가 기록이 무너지지 않게 하기 위함이다.
--  * 금액/수량은 부동소수점(float) 대신 numeric 을 쓴다.

-- ─────────────────────────────────────────────────────────
-- 단위: g, kg, ml, L, 개, 봉, 팩, 박스
-- ─────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'unit_kind') then
    create type unit_kind as enum ('g', 'kg', 'ml', 'L', '개', '봉', '팩', '박스');
  end if;
  if not exists (select 1 from pg_type where typname = 'recipe_item_kind') then
    create type recipe_item_kind as enum ('ingredient', 'manual');
  end if;
end $$;

-- ─────────────────────────────────────────────────────────
-- 프로필 (auth.users 와 1:1)
-- ─────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 가입하면 프로필이 자동으로 생기도록 한다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- 내 재료
-- ─────────────────────────────────────────────────────────
create table if not exists public.ingredients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  price       numeric(12, 2) not null check (price >= 0),
  quantity    numeric(14, 4) not null check (quantity > 0),
  unit        unit_kind not null,
  memo        text,
  supplier    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ingredients_user_idx on public.ingredients (user_id, created_at desc);

-- 재료 가격 변동 이력 (대시보드의 "최근 변경된 재료")
create table if not exists public.ingredient_price_history (
  id             uuid primary key default gen_random_uuid(),
  ingredient_id  uuid not null references public.ingredients (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  price          numeric(12, 2) not null,
  quantity       numeric(14, 4) not null,
  unit           unit_kind not null,
  unit_cost      numeric(16, 6) not null,
  recorded_at    timestamptz not null default now()
);

create index if not exists ingredient_price_history_idx
  on public.ingredient_price_history (ingredient_id, recorded_at desc);

-- ─────────────────────────────────────────────────────────
-- 내 메뉴
-- ─────────────────────────────────────────────────────────
create table if not exists public.menus (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  category       text not null default '기타',
  selling_price  numeric(12, 2) not null default 0 check (selling_price >= 0),
  memo           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists menus_user_idx on public.menus (user_id, created_at desc);

-- 레시피 한 줄. 재료를 참조하더라도 그 시점의 가격을 함께 저장한다.
create table if not exists public.recipe_items (
  id             uuid primary key default gen_random_uuid(),
  menu_id        uuid not null references public.menus (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  kind           recipe_item_kind not null default 'ingredient',
  ingredient_id  uuid references public.ingredients (id) on delete set null,
  name           text not null,
  price          numeric(12, 2) not null default 0,
  quantity       numeric(14, 4) not null default 0,
  unit           unit_kind not null default 'g',
  amount         numeric(14, 4) not null default 0,
  amount_unit    unit_kind not null default 'g',
  manual_cost    numeric(12, 2) not null default 0,
  position       integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists recipe_items_menu_idx on public.recipe_items (menu_id, position);
create index if not exists recipe_items_ingredient_idx on public.recipe_items (ingredient_id);

-- 메뉴 원가 변동 이력 (원가가 바뀔 때만 기록)
create table if not exists public.menu_cost_history (
  id           uuid primary key default gen_random_uuid(),
  menu_id      uuid not null references public.menus (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  cost         numeric(12, 2) not null,
  recorded_at  timestamptz not null default now()
);

create index if not exists menu_cost_history_idx on public.menu_cost_history (menu_id, recorded_at desc);

-- 사용자가 직접 추가한 카테고리
create table if not exists public.custom_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ─────────────────────────────────────────────────────────
-- updated_at 자동 갱신
-- ─────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ingredients_touch on public.ingredients;
create trigger ingredients_touch before update on public.ingredients
  for each row execute function public.touch_updated_at();

drop trigger if exists menus_touch on public.menus;
create trigger menus_touch before update on public.menus
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────
-- RLS: 본인 데이터만 읽고 쓸 수 있다
-- ─────────────────────────────────────────────────────────
alter table public.profiles                 enable row level security;
alter table public.ingredients              enable row level security;
alter table public.ingredient_price_history enable row level security;
alter table public.menus                    enable row level security;
alter table public.recipe_items             enable row level security;
alter table public.menu_cost_history        enable row level security;
alter table public.custom_categories        enable row level security;

drop policy if exists "profiles are self-service" on public.profiles;
create policy "profiles are self-service" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'ingredients', 'ingredient_price_history', 'menus',
    'recipe_items', 'menu_cost_history', 'custom_categories'
  ] loop
    execute format('drop policy if exists "owner can do everything" on public.%I', t);
    execute format(
      'create policy "owner can do everything" on public.%I
         for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
