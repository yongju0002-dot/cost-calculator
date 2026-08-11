-- WongaGo 계정 관리 (3단계)
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 기존 profiles 표에 컬럼만 추가합니다. 기존 사용자 데이터는 그대로 유지됩니다.

alter table public.profiles add column if not exists store_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists plan text not null default 'FREE';

-- plan 값은 FREE/PRO/BUSINESS 셋 중 하나만 허용한다.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_check check (plan in ('FREE', 'PRO', 'BUSINESS'));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────
-- 중요: plan 은 이용자가 직접 못 바꾸게 막는다.
--
-- 지금까지는 "본인 행이면 뭐든 수정 가능" 규칙(RLS)만 있었는데, 그것만으로는
-- 이용자가 자기 profiles 행의 plan 컬럼을 직접 'PRO' 로 바꿔버릴 수 있다.
-- (행 단위 보안과 컬럼 단위 보안은 별개라 RLS 만으로는 막을 수 없다.)
--
-- 그래서 authenticated 역할에서 UPDATE 권한을 전부 회수한 뒤,
-- 이용자가 직접 고쳐도 되는 컬럼(이름·가게이름·연락처·프로필사진)만 다시 열어준다.
-- plan, email 은 이 목록에 없으므로 이용자가 절대 못 바꾼다.
-- (나중에 결제를 붙이면 plan 은 서버 쪽 관리자 권한으로만 바꾸면 된다.)
-- ─────────────────────────────────────────────────────────
revoke update on public.profiles from authenticated;
grant update (name, store_name, phone, avatar_url) on public.profiles to authenticated;
