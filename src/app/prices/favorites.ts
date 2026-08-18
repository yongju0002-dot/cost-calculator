/**
 * 시세 즐겨찾기.
 *
 * 로그인 여부와 상관없이(원가 계산처럼 회원가입 없이도 되는 기능이라) 이 브라우저에만
 * 저장한다. 품목의 "품종별 줄" 키(예: "500_4304::삼겹살")를 그대로 저장하므로,
 * 소매/도매를 바꾸거나 지역을 바꿔도 같은 품목이 계속 즐겨찾기로 남는다.
 */

const STORAGE_KEY = 'wongago:price-favorites';

export function readFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavorites(keys: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // 저장 공간이 꽉 찼거나 접근이 막혀 있어도 화면 사용에는 지장이 없어야 하니 조용히 넘어간다.
  }
}

export function toggleFavorite(current: string[], key: string): string[] {
  const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
  writeFavorites(next);
  return next;
}
