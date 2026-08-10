-- WongaGo 서버 저장 (2단계)
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 기존 테이블은 그대로 두고 이 표만 추가합니다.
--
-- 왜 표 하나에 통째로 저장하나요?
--   원가 계산은 전부 브라우저에서 이뤄지고, 서버는 "내 데이터를 다른 기기에서도 보이게"
--   하는 역할만 합니다. 재료·프렙·메뉴를 여러 표로 쪼개 저장하면 저장 중간에 일부만
--   반영되는 사고가 날 수 있는데, 한 번에 저장하면 그런 일이 생기지 않습니다.
--   나중에 서버에서 매출 분석 같은 걸 하게 되면 그때 표를 나누면 됩니다.

create table if not exists public.app_data (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  -- 재료 / 프렙 / 부자재 / 메뉴 / 매입 이력 전체
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create or replace function public.touch_app_data()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists app_data_touch on public.app_data;
create trigger app_data_touch before update on public.app_data
  for each row execute function public.touch_app_data();

-- 본인 데이터만 읽고 쓸 수 있다.
alter table public.app_data enable row level security;

drop policy if exists "own app data" on public.app_data;
create policy "own app data" on public.app_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
