'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 브라우저 클라이언트.
 *
 * 이 앱은 서버에서 사용자별 데이터를 그리지 않고 전부 브라우저에서 처리하므로
 * 브라우저 클라이언트 하나만 있으면 된다. (세션 갱신은 라이브러리가 알아서 한다)
 *
 * 환경변수가 없으면 null 을 돌려주고, 앱은 기존의 브라우저 로컬 계정 방식으로 동작한다.
 * 덕분에 코드를 먼저 배포해 두고 환경변수를 넣는 순간 서버 로그인이 켜진다.
 */

/**
 * Supabase 프로젝트 URL 정리.
 *
 * Supabase 대시보드의 "Data API" 화면은 REST 엔드포인트(.../rest/v1/)를 크게 보여주는데,
 * 이 값을 그대로 복사해 넣으면 supabase-js 가 인증 요청 경로를
 * ".../rest/v1/auth/v1/signup" 처럼 잘못 조합해 "Invalid path" 오류가 난다.
 * 실제로 필요한 값은 경로 없는 프로젝트 origin 뿐이므로, 실수로 붙은 경로/슬래시를 제거한다.
 */
function resolveSupabaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
}

const SUPABASE_URL = resolveSupabaseUrl();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  // 서버 렌더링 중에는 만들지 않는다. (브라우저 저장소에 세션을 보관하기 때문)
  if (typeof window === 'undefined') return null;
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // 구글 로그인 후 돌아온 주소에 붙은 인증 코드를 자동으로 처리한다.
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return cached;
}
