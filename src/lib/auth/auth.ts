'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
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

/**
 * 인증 레이어.
 *
 * 현재 구현은 브라우저에 계정을 저장하는 로컬 인증이다.
 * (별도 서버 없이 바로 쓸 수 있고, 데이터도 사용자 기기에만 남는다.)
 *
 * 나중에 서버/OAuth 로 옮길 때는 이 파일의 함수 본문만 교체하면 되고
 * 화면 코드는 그대로 둘 수 있도록 인터페이스를 맞춰두었다.
 */

export interface AuthState {
  user: SessionUser | null;
  /** 브라우저 저장소에서 로그인 상태를 읽어왔는지 여부 */
  ready: boolean;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const SERVER_STATE: AuthState = { user: null, ready: false };

function readAccounts(): Account[] {
  return readJson<Account[]>(storageKeys.accounts, []);
}

function toSessionUser(account: Account): SessionUser {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    provider: account.provider,
  };
}

function loadSession(): SessionUser | null {
  const session = readJson<SessionUser | null>(storageKeys.session, null);
  if (!session?.id) return null;
  // 계정이 삭제된 경우를 대비해 실제 계정 존재 여부를 확인한다.
  const account = readAccounts().find((a) => a.id === session.id);
  return account ? toSessionUser(account) : null;
}

const store = new ExternalStore<AuthState>(
  () => SERVER_STATE,
  () => ({ user: loadSession(), ready: true }),
);

// 다른 탭에서 로그인/로그아웃한 경우에도 화면이 따라오도록 한다.
if (isBrowser()) {
  window.addEventListener('storage', (event) => {
    if (event.key === storageKeys.session || event.key === storageKeys.accounts) {
      store.replace({ user: loadSession(), ready: true });
    }
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
  // crypto.subtle 을 쓸 수 없는 환경(비보안 컨텍스트)을 위한 대비책
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${hash.toString(16)}`;
}

function persistSession(user: SessionUser | null): void {
  if (user) writeJson(storageKeys.session, user);
  else removeKey(storageKeys.session);
  store.replace({ user, ready: true });
}

export async function signUp(input: {
  email: string;
  password: string;
  name: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('올바른 이메일 주소를 입력해주세요.');
  }
  if (input.password.length < 6) {
    throw new Error('비밀번호는 6자 이상으로 입력해주세요.');
  }
  const accounts = readAccounts();
  if (accounts.some((a) => a.email === email)) {
    throw new Error('이미 가입된 이메일입니다. 로그인해주세요.');
  }
  const salt = createId('salt');
  const account: Account = {
    id: createId('user'),
    email,
    name: input.name.trim() || email.split('@')[0],
    provider: 'email',
    salt,
    passwordHash: await hashPassword(input.password, salt),
    createdAt: nowIso(),
  };
  writeJson(storageKeys.accounts, [...accounts, account]);
  persistSession(toSessionUser(account));
}

export async function signIn(input: { email: string; password: string }): Promise<void> {
  const email = normalizeEmail(input.email);
  const account = readAccounts().find((a) => a.email === email);
  if (!account || !account.salt || !account.passwordHash) {
    throw new Error('가입되지 않은 이메일입니다.');
  }
  const hash = await hashPassword(input.password, account.salt);
  if (hash !== account.passwordHash) {
    throw new Error('비밀번호가 일치하지 않습니다.');
  }
  persistSession(toSessionUser(account));
}

export async function signInWithGoogle(): Promise<void> {
  // OAuth 클라이언트 ID 가 설정되기 전까지는 명확히 안내한다.
  throw new Error(
    'Google 로그인은 아직 연결되지 않았습니다. 이메일로 가입하시면 바로 사용할 수 있습니다.',
  );
}

export function signOut(): void {
  persistSession(null);
}

export interface UseAuthResult extends AuthState {
  signUp: typeof signUp;
  signIn: typeof signIn;
  signInWithGoogle: typeof signInWithGoogle;
  signOut: typeof signOut;
  isGoogleEnabled: boolean;
}

export function useAuth(): UseAuthResult {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const handleSignOut = useCallback(() => signOut(), []);

  return useMemo(
    () => ({
      ...state,
      signUp,
      signIn,
      signInWithGoogle,
      signOut: handleSignOut,
      isGoogleEnabled: Boolean(GOOGLE_CLIENT_ID),
    }),
    [state, handleSignOut],
  );
}
