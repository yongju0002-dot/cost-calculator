import { roundTo } from './money';
import type { FixedCost } from './types';

/**
 * 손익분기점 계산.
 *
 * 메뉴 원가(재료비)는 "하나 더 팔면 그만큼 더 나가는 돈"이고, 임대료·인건비 같은
 * 고정비는 "몇 개를 팔든 매달 똑같이 나가는 돈"이다. 둘은 성격이 달라서 원가율에
 * 섞지 않고, 여기서 따로 계산한다.
 *
 * 핵심은 공헌이익(판매가 − 재료비)이다. 한 개 팔 때 고정비를 갚는 데 보태지는 금액이
 * 공헌이익이고, 이걸로 한 달 고정비를 다 갚는 순간이 손익분기점이다.
 *
 * 주의: 재료비만 뺀 값이라 카드 수수료·배달 수수료처럼 팔 때마다 나가는 다른 비용은
 * 아직 반영되지 않는다. 그래서 실제 손익분기점은 여기 계산보다 조금 높다.
 */

/** 한 달 영업일수 기본값. 주 6일 영업을 가정한다. */
export const DEFAULT_OPERATING_DAYS = 26;

export const MIN_OPERATING_DAYS = 1;
export const MAX_OPERATING_DAYS = 31;

export function normalizeOperatingDays(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_OPERATING_DAYS;
  const rounded = Math.round(value);
  if (rounded < MIN_OPERATING_DAYS) return MIN_OPERATING_DAYS;
  if (rounded > MAX_OPERATING_DAYS) return MAX_OPERATING_DAYS;
  return rounded;
}

/** 한 달 고정비 합계 */
export function totalFixedCost(fixedCosts: FixedCost[]): number {
  return fixedCosts.reduce((sum, c) => sum + (Number.isFinite(c.amount) ? c.amount : 0), 0);
}

/** 분류별 합계. 화면에서 "어디에 제일 많이 나가는지" 보여줄 때 쓴다. */
export function fixedCostByCategory(fixedCosts: FixedCost[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of fixedCosts) {
    const amount = Number.isFinite(c.amount) ? c.amount : 0;
    map.set(c.category, (map.get(c.category) ?? 0) + amount);
  }
  return map;
}

/**
 * 공헌이익 = 판매가 − 재료비. 한 개 팔 때 고정비를 갚는 데 보태지는 금액.
 * 판매가가 없으면(0) 계산할 수 없다.
 */
export function contributionMargin(sellingPrice: number, cost: number): number | null {
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) return null;
  if (!Number.isFinite(cost)) return null;
  return roundTo(sellingPrice - cost, 2);
}

/** 공헌이익률(%) = 공헌이익 ÷ 판매가 × 100 */
export function contributionMarginRate(sellingPrice: number, cost: number): number | null {
  const margin = contributionMargin(sellingPrice, cost);
  if (margin === null) return null;
  return roundTo((margin / sellingPrice) * 100, 1);
}

/**
 * 이 메뉴만 팔아서 한 달 고정비를 갚으려면 몇 개를 팔아야 하는지.
 *
 * 공헌이익이 0 이하면 팔수록 손해라 아무리 팔아도 고정비를 갚을 수 없다. 이때는
 * null 을 돌려주고 화면에서 따로 경고한다 — 0 이나 Infinity 로 뭉개면 "많이 팔면
 * 된다"는 반대 결론으로 읽히기 때문이다.
 */
export function breakevenUnits(fixedTotal: number, margin: number | null): number | null {
  if (margin === null || margin <= 0) return null;
  if (!Number.isFinite(fixedTotal) || fixedTotal <= 0) return 0;
  return Math.ceil(fixedTotal / margin);
}

export interface MenuBreakeven {
  menuId: string;
  name: string;
  sellingPrice: number;
  cost: number;
  /** 한 개 팔 때 고정비를 갚는 데 보태지는 금액. 판매가가 없으면 null */
  margin: number | null;
  marginRate: number | null;
  /** 이 메뉴만 팔았을 때 한 달 필요 판매량. 팔수록 손해면 null */
  monthlyUnits: number | null;
  /** 하루 필요 판매량 */
  dailyUnits: number | null;
  /** 팔수록 손해인 메뉴 (판매가 ≤ 재료비) */
  losing: boolean;
}

/** 메뉴 하나에 대한 손익분기 계산 */
export function menuBreakeven(
  input: { menuId: string; name: string; sellingPrice: number; cost: number },
  fixedTotal: number,
  operatingDays: number,
): MenuBreakeven {
  const margin = contributionMargin(input.sellingPrice, input.cost);
  const monthlyUnits = breakevenUnits(fixedTotal, margin);
  const days = normalizeOperatingDays(operatingDays);
  return {
    menuId: input.menuId,
    name: input.name,
    sellingPrice: input.sellingPrice,
    cost: input.cost,
    margin,
    marginRate: contributionMarginRate(input.sellingPrice, input.cost),
    monthlyUnits,
    dailyUnits: monthlyUnits === null ? null : Math.ceil(monthlyUnits / days),
    losing: margin !== null && margin <= 0,
  };
}

export interface BreakevenSummary {
  fixedTotal: number;
  operatingDays: number;
  /** 남는 메뉴들의 평균 공헌이익률(%). 계산할 메뉴가 없으면 null */
  averageMarginRate: number | null;
  /** 평균 공헌이익률 기준, 한 달에 필요한 매출 */
  monthlyRevenue: number | null;
  /** 하루에 필요한 매출 */
  dailyRevenue: number | null;
  /** 평균 계산에 쓴 메뉴 수 */
  menuCount: number;
  /** 팔수록 손해라 평균에서 제외한 메뉴 수 */
  excludedCount: number;
}

/**
 * 전체 손익분기 매출.
 *
 * 메뉴마다 공헌이익률이 다르므로, 평균 공헌이익률을 써서 "이 가게 평균으로 팔았을 때"
 * 얼마를 팔아야 본전인지 구한다. 어떤 메뉴가 많이 팔리느냐에 따라 실제 값은 달라지므로
 * 어림값이다. (정확히 하려면 메뉴별 판매량이 필요한데 아직 받지 않는다)
 *
 * 적자 메뉴(공헌이익 ≤ 0)는 평균에서 뺀다. 팔아도 고정비를 갚는 데 보탬이 되지 않아
 * "본전 매출"의 분모로 쓸 수 없기 때문이다. 그냥 섞으면 적자 메뉴 하나가 평균을 끌어내려
 * 본전 매출이 몇 배로 뻥튀기된다 — 예를 들어 73% 짜리와 -66% 짜리를 평균 내면 3.1% 가
 * 되어, 실제로는 274만원이면 될 것이 6,451만원으로 나온다. 제외한 개수는 따로 돌려주니
 * 화면에서 안내한다.
 */
export function breakevenSummary(
  menus: { sellingPrice: number; cost: number }[],
  fixedTotal: number,
  operatingDays: number,
): BreakevenSummary {
  const days = normalizeOperatingDays(operatingDays);
  const rates = menus
    .map((m) => contributionMarginRate(m.sellingPrice, m.cost))
    .filter((r): r is number => r !== null);

  const usable = rates.filter((r) => r > 0);

  const averageMarginRate =
    usable.length > 0 ? roundTo(usable.reduce((sum, r) => sum + r, 0) / usable.length, 1) : null;

  const monthlyRevenue =
    averageMarginRate !== null && averageMarginRate > 0
      ? Math.ceil(fixedTotal / (averageMarginRate / 100))
      : null;

  return {
    fixedTotal,
    operatingDays: days,
    averageMarginRate,
    monthlyRevenue,
    dailyRevenue: monthlyRevenue === null ? null : Math.ceil(monthlyRevenue / days),
    menuCount: usable.length,
    excludedCount: rates.length - usable.length,
  };
}
