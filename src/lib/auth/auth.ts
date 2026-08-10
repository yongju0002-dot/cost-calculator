'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Account, SessionUser } from '@/lib/domain/types';
import {
  createId,
  isBrowser,
  nowIso,
  readJson,
  removeKey,
  storageKeys,
  writeJson,
} from '@/lib/storage/local';
import { ExternalStore } from '@/lib/store/externalStore';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * 인증 레이어.
 *
 * 두 가지 방식을 지원한다.
 *  1. Supabase (환경변수가 설정된 경우) — 이메일 + 구글 로그인, 기기가 달라도 같은 계정
 *  2. 브라우저 로컬 계정 (환경변수가 없는 경우) — 서버 없이 동작하는 대비책
 *
 * 화면 코드는 어느 쪽인지 몰라도 되도록 useAuth() 의 모양을 동일하게 유지한다.
 */

export interface AuthState {
  user: SessionUser | null;
  /** 로그인 상태를 읽어왔는지 여부 */
  ready: boolean;
}

export interface SignUpResult {
  /** 메일함에서 확인 링크를 눌러야 로그인이 완료되는 경우 */
  needsEmailConfirm: boolean;
}

const SERVER_STATE: AuthState = { user: null, ready: false };

// ─────────────────────────────────────────────
// 브라우저 로컬 계정 (Supabase 미설정 시)
// ─────────────────────────────────────────────

function readAccounts(): Account[] {
  return readJson<Account[]>(storageKeys.accounts, []);
}

function toLocalSessionUser(account: Account): SessionUser {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    provider: account.provider,
  };
}

function loadLocalSession(): SessionUser | null {
  const session = readJson<SessionUser | null>(storageKeys.session, null);
  if (!session?.id) return null;
  const account = readAccounts().find((a) => a.id === session.id);
  return account ? toLocalSessionUser(account) : null;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${hash.toString(16)}`;
}

function persistLocalSession(user: SessionUser | null): void {
  if (user) writeJson(storageKeys.session, user);
  else removeKey(storageKeys.session);
  store.replace({ user, ready: true });
}

// ─────────────────────────────────────────────
// Supabase
// ─────────────────────────────────────────────

function toSessionUser(session: Session | null): SessionUser | null {
  const user = session?.user;
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName = typeof meta.name === 'string' ? meta.name.trim() : '';
  const metaFullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  const email = user.email ?? '';
  return {
    id: user.id,
    email,
    name: metaName || metaFullName || (email ? email.split('@')[0] : '사장님'),
    provider: user.app_metadata?.provider === 'google' ? 'google' : 'email',
  };
}

let supabaseSyncStarted = false;

/** 세션을 읽어오고, 이후 로그인/로그아웃을 계속 반영한다. */
function startSupabaseSync(): void {
  if (supabaseSyncStarted) return;
  const supabase = getSupabase();
  if (!supabase) {
    store.replace({ user: null, ready: true });
    return;
  }
  supabaseSyncStarted = true;

  supabase.auth
    .getSession()
    .then(({ data }) => store.replace({ user: toSessionUser(data.session), ready: true }))
    .catch(() => store.replace({ user: null, ready: true }));

  supabase.auth.onAuthStateChange((_event, session) => {
    store.replace({ user: toSessionUser(session), ready: true });
  });
}

/** Supabase 가 돌려주는 영어 오류를 사장님이 이해할 수 있는 문장으로 바꾼다. */
function toKoreanAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (m.includes('email not confirmed')) return '가입 확인 메일의 링크를 먼저 눌러주세요.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return '이미 가입된 이메일입니다. 로그인해주세요.';
  }
  if (m.includes('password should be at least')) return '비밀번호는 6자 이상으로 입력해주세요.';
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return '올바른 이메일 주소를 입력해주세요.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (m.includes('provider is not enabled')) {
    return 'Google 로그인이 아직 켜져 있지 않습니다. 이메일로 가입해주세요.';
  }
  return message;
}

function callbackUrl(next?: string): string {
  const base = `${window.location.origin}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

// ─────────────────────────────────────────────
// 스토어
// ─────────────────────────────────────────────

function hydrate(): AuthState {
  if (isSupabaseConfigured) {
    // 세션 조회는 비동기라 일단 "확인 중" 상태로 두고, 결과가 오면 갱신한다.
    startSupabaseSync();
    return { user: null, ready: false };
  }
  return { user: loadLocalSession(), ready: true };
}

const store = new ExternalStore<AuthState>(() => SERVER_STATE, hydrate);

// 다른 탭에서 로그인/로그아웃한 경우에도 화면이 따라오도록 한다. (로컬 계정 방식 전용)
if (isBrowser() && !isSupabaseConfigured) {
  window.addEventListener('storage', (event) => {
    if (event.key === storageKeys.session || event.key === storageKeys.accounts) {
      store.replace({ user: loadLocalSession(), ready: true });
    }
  });
}

// ─────────────────────────────────────────────
// 동작
// ─────────────────────────────────────────────

export async function signUp(input: {
  email: string;
  password: string;
  name: string;
}): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { name }, emailRedirectTo: callbackUrl('/dashboard') },
    });
    if (error) throw new Error(toKoreanAuthError(error.message));
    return { needsEmailConfirm: !data.session };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('올바른 이메일 주소를 입력해주세요.');
  }
  if (input.password.length < 6) throw new Error('비밀번호는 6자 이상으로 입력해주세요.');
  const accounts = readAccounts();
  if (accounts.some((a) => a.email === email)) {
    throw new Error('이미 가입된 이메일입니다. 로그인해주세요.');
  }
  const salt = createId('salt');
  const account: Account = {
    id: createId('user'),
    email,
    name: name || email.split('@')[0],
    provider: 'email',
    salt,
    passwordHash: await hashPassword(input.password, salt),
    createdAt: nowIso(),
  };
  writeJson(storageKeys.accounts, [...accounts, account]);
  persistLocalSession(toLocalSessionUser(account));
  return { needsEmailConfirm: false };
}

export async function signIn(input: { email: string; password: string }): Promise<void> {
  const email = input.email.trim().toLowerCase();

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: input.password });
    if (error) throw new Error(toKoreanAuthError(error.message));
    return;
  }

  const account = readAccounts().find((a) => a.email === email);
  if (!account || !account.salt || !account.passwordHash) {
    throw new Error('가입되지 않은 이메일입니다.');
  }
  if ((await hashPassword(input.password, account.salt)) !== account.passwordHash) {
    throw new Error('비밀번호가 일치하지 않습니다.');
  }
  persistLocalSession(toLocalSessionUser(account));
}

/** 구글 계정으로 로그인. 성공하면 구글 로그인 화면으로 이동한다. */
export async function signInWithGoogle(next?: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      'Google 로그인은 아직 연결되지 않았습니다. 이메일로 가입하시면 바로 사용할 수 있습니다.',
    );
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl(next) },
  });
  if (error) throw new Error(toKoreanAuthError(error.message));
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
    store.replace({ user: null, ready: true });
    return;
  }
  persistLocalSession(null);
}

export interface UseAuthResult extends AuthState {
  signUp: typeof signUp;
  signIn: typeof signIn;
  signInWithGoogle: typeof signInWithGoogle;
  signOut: typeof signOut;
  /** 구글 로그인 버튼을 쓸 수 있는지 */
  isGoogleEnabled: boolean;
  /** 서버 계정(Supabase)인지, 이 브라우저에만 있는 계정인지 */
  isServerAuth: boolean;
}

export function useAuth(): UseAuthResult {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  return useMemo(
    () => ({
      ...state,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      isGoogleEnabled: isSupabaseConfigured,
      isServerAuth: isSupabaseConfigured,
    }),
    [state],
  );
}
