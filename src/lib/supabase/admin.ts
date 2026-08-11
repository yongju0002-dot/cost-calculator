import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 서버 전용 Supabase 클라이언트 (service_role 키 사용).
 *
 * 절대 'use client' 파일에서 불러오면 안 된다. service_role 키는 모든 이용자의
 * 데이터에 접근할 수 있는 마스터 키와 같아서, 브라우저에 노출되면 그 순간
 * 전체 서비스가 뚫린다. 이 파일은 Route Handler(app/api/.../route.ts)처럼
 * 서버에서만 실행되는 코드에서만 불러온다.
 *
 * 'server-only' 패키지가 실수로 클라이언트 번들에 섞여 들어가면 빌드 자체를
 * 실패시켜 준다.
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
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

export const isAdminConfigured = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isAdminConfigured) return null;
  if (!cached) {
    cached = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
