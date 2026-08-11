/**
 * 무료 요금제 한도.
 *
 * 유료 전환을 준비하며 넣어둔 값이다. 나중에 요금제가 여러 개로 늘어나면
 * 이 상수를 직접 쓰는 대신, 사용자의 요금제에 따라 한도를 고르는 함수로
 * 바꾸면 된다. (호출부는 limitStatus() 하나만 거치므로 그때도 손댈 곳이 적다)
 */
export const FREE_PLAN_LIMITS = {
  ingredients: 100,
  preps: 20,
  menus: 20,
  supplies: 20,
} as const;

export type LimitTarget = keyof typeof FREE_PLAN_LIMITS;

export const LIMIT_LABELS: Record<LimitTarget, string> = {
  ingredients: '재료',
  preps: '프렙',
  menus: '메뉴',
  supplies: '부자재',
};

export interface LimitStatus {
  target: LimitTarget;
  count: number;
  max: number;
  remaining: number;
  atLimit: boolean;
}

export function limitStatus(target: LimitTarget, count: number): LimitStatus {
  const max = FREE_PLAN_LIMITS[target];
  const remaining = Math.max(0, max - count);
  return { target, count, max, remaining, atLimit: count >= max };
}

export function limitReachedMessage(target: LimitTarget): string {
  return `무료 요금제에서는 ${LIMIT_LABELS[target]}를 최대 ${FREE_PLAN_LIMITS[target]}개까지 등록할 수 있습니다.`;
}
