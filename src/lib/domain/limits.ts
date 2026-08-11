/**
 * 요금제와 등록 한도.
 *
 * 지금은 결제 기능이 없어 모든 계정이 FREE 로 고정된다. PRO/BUSINESS 값은
 * 나중에 결제를 붙일 때 그대로 쓸 수 있도록 미리 만들어 둔 자리다.
 * (실제로 그 값을 쓰게 하려면, 서버 쪽에서 plan 을 검증한 뒤 붙이는 결제
 * 로직이 별도로 필요하다 — 지금은 화면에 "PRO 안내"를 보여주는 정도로만 쓴다.)
 */
export type Plan = 'FREE' | 'PRO' | 'BUSINESS';

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: 'FREE',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
};

interface PlanLimitConfig {
  ingredients: number;
  preps: number;
  menus: number;
  supplies: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimitConfig> = {
  FREE: { ingredients: 100, preps: 20, menus: 20, supplies: 20 },
  // 아직 실제로 적용되지 않는다. 결제 기능을 붙일 때 값을 확정한다.
  PRO: { ingredients: 500, preps: 100, menus: 100, supplies: 100 },
  BUSINESS: { ingredients: 2000, preps: 300, menus: 300, supplies: 300 },
};

export type LimitTarget = keyof PlanLimitConfig;

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

export function limitStatus(target: LimitTarget, count: number, plan: Plan = 'FREE'): LimitStatus {
  const max = PLAN_LIMITS[plan][target];
  const remaining = Math.max(0, max - count);
  return { target, count, max, remaining, atLimit: count >= max };
}

export function limitReachedMessage(target: LimitTarget, plan: Plan = 'FREE'): string {
  return `${PLAN_LABELS[plan]} 플랜의 등록 한도에 도달했습니다. ${plan === 'FREE' ? '무료' : PLAN_LABELS[plan]} 플랜에서는 최대 ${PLAN_LIMITS[plan][target]}개의 ${LIMIT_LABELS[target]}를 등록할 수 있습니다.`;
}
