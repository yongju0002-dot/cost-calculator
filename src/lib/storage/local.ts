/**
 * localStorage 어댑터.
 *
 * 지금은 브라우저 저장소를 쓰지만, 나중에 서버 API 로 교체할 때
 * 이 파일과 repository 의 시그니처만 바꾸면 되도록 접근 지점을 한 곳으로 모았다.
 */

const PREFIX = 'wonga';

export const storageKeys = {
  accounts: `${PREFIX}:accounts:v1`,
  session: `${PREFIX}:session:v1`,
  draft: `${PREFIX}:draft:v1`,
  data: (ownerId: string) => `${PREFIX}:data:${ownerId}:v1`,
};

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 가득 찬 경우 등 — 앱이 죽지 않도록 무시한다.
  }
}

export function removeKey(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** 충돌 가능성이 낮은 id 생성 */
export function createId(prefix = 'id'): string {
  if (isBrowser() && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
