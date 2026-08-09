import { roundTo, roundWon, ceilTo } from './money';
import { baseUnitOf, isConvertible, toBaseAmount, type Unit } from './units';
import type { Ingredient, Menu, RecipeItem } from './types';

/**
 * 원가 계산 로직 (UI 와 완전히 분리되어 있다).
 * 모든 함수는 순수 함수이며 테스트 가능하다.
 */

export interface UnitCost {
  /** 기준 단위 1개당 원가 */
  value: number;
  /** 기준 단위 (g / ml / 개 / 봉 / 팩 / 박스) */
  unit: Unit;
}

/**
 * 구매가격과 구매수량으로 단위 원가를 구한다.
 * 예) 45,000원 / 5kg -> 9원/g
 */
export function computeUnitCost(
  price: number,
  quantity: number,
  unit: Unit,
): UnitCost | null {
  if (!Number.isFinite(price) || !Number.isFinite(quantity)) return null;
  if (price < 0 || quantity <= 0) return null;
  const baseQuantity = toBaseAmount(quantity, unit);
  if (baseQuantity <= 0) return null;
  return {
    // 소수점 6자리까지 유지해 누적 오차를 줄인다.
    value: roundTo(price / baseQuantity, 6),
    unit: baseUnitOf(unit),
  };
}

export function ingredientUnitCost(ingredient: Ingredient): UnitCost | null {
  return computeUnitCost(ingredient.price, ingredient.quantity, ingredient.unit);
}

/** 레시피 한 줄의 금액 (원 단위 반올림) */
export function computeItemCost(item: RecipeItem): number {
  if (item.kind === 'manual') {
    return Number.isFinite(item.manualCost) ? roundWon(Math.max(0, item.manualCost)) : 0;
  }
  const unitCost = computeUnitCost(item.price, item.quantity, item.unit);
  if (!unitCost) return 0;
  if (!Number.isFinite(item.amount) || item.amount <= 0) return 0;
  if (!isConvertible(item.unit, item.amountUnit)) return 0;
  return roundWon(unitCost.value * toBaseAmount(item.amount, item.amountUnit));
}

/**
 * 레시피 전체 재료 원가.
 * 화면에 보이는 줄별 금액을 그대로 더해야 사용자가 검산할 수 있으므로
 * 각 줄을 원 단위로 반올림한 뒤 합산한다.
 */
export function computeRecipeCost(items: RecipeItem[]): number {
  return items.reduce((sum, item) => sum + computeItemCost(item), 0);
}

/**
 * 저장된 재료의 최신 가격을 반영해 레시피 항목을 동기화한다.
 * (재료 가격을 수정하면 연결된 메뉴 원가가 자동으로 바뀌는 근거)
 */
export function syncItemWithIngredient(
  item: RecipeItem,
  ingredients: Map<string, Ingredient>,
): RecipeItem {
  if (item.kind !== 'ingredient' || !item.ingredientId) return item;
  const ingredient = ingredients.get(item.ingredientId);
  if (!ingredient) return item;
  // 재료의 단위 계열이 바뀌었다면(예: kg -> 개) 기존 사용량을 환산할 수 없다.
  // 이 경우 사용 단위를 그대로 두어 금액이 0원으로 계산되게 하고, 사용자가 직접 수정하도록 한다.
  return {
    ...item,
    name: ingredient.name,
    price: ingredient.price,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
  };
}

export function syncMenuItems(
  menu: Menu,
  ingredients: Map<string, Ingredient>,
): RecipeItem[] {
  return menu.items.map((item) => syncItemWithIngredient(item, ingredients));
}

export function computeMenuCost(menu: Menu, ingredients: Map<string, Ingredient>): number {
  return computeRecipeCost(syncMenuItems(menu, ingredients));
}

/** 원가율(%) = 재료 원가 ÷ 판매가격 × 100 */
export function computeCostRate(cost: number, sellingPrice: number): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(sellingPrice)) return null;
  if (sellingPrice <= 0) return null;
  return roundTo((cost / sellingPrice) * 100, 1);
}

/** 판매가격에서 재료비를 뺀 금액 (인건비·임대료 등은 포함되지 않은 금액) */
export function computeMarginAmount(cost: number, sellingPrice: number): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(sellingPrice)) return null;
  if (sellingPrice <= 0) return null;
  return roundWon(sellingPrice - cost);
}

export type CostRateLevelId = 'low' | 'normal' | 'high' | 'veryHigh';

export interface CostRateLevel {
  id: CostRateLevelId;
  label: string;
  /** 0 이상 max 미만 */
  max: number;
  description: string;
}

export const COST_RATE_LEVELS: CostRateLevel[] = [
  { id: 'low', label: '낮음', max: 30, description: '재료비 부담이 적은 편입니다.' },
  { id: 'normal', label: '보통', max: 40, description: '일반적인 수준의 원가율입니다.' },
  { id: 'high', label: '높음', max: 50, description: '재료비 비중이 높은 편입니다.' },
  {
    id: 'veryHigh',
    label: '매우 높음',
    max: Infinity,
    description: '판매가격이나 사용량을 다시 확인해 보세요.',
  },
];

export function costRateLevel(rate: number | null): CostRateLevel | null {
  if (rate === null || !Number.isFinite(rate)) return null;
  return COST_RATE_LEVELS.find((level) => rate < level.max) ?? COST_RATE_LEVELS.at(-1)!;
}

export interface SuggestedPrice {
  /** 목표 원가율을 정확히 맞추는 가격 */
  exact: number;
  /** 실제로 쓰기 좋게 올림한 추천 가격 */
  recommended: number;
  /** 추천 가격 기준 실제 원가율 */
  actualRate: number | null;
}

/**
 * 목표 원가율로 적정 판매가격을 계산한다.
 * 예) 재료 원가 3,000원 / 목표 원가율 30% -> 10,000원
 */
export function computeSuggestedPrice(
  cost: number,
  targetRatePercent: number,
  roundUnit = 100,
): SuggestedPrice | null {
  if (!Number.isFinite(cost) || cost <= 0) return null;
  if (!Number.isFinite(targetRatePercent) || targetRatePercent <= 0 || targetRatePercent > 100) {
    return null;
  }
  const exact = roundTo(cost / (targetRatePercent / 100), 2);
  const recommended = ceilTo(exact, roundUnit);
  return {
    exact,
    recommended,
    actualRate: computeCostRate(cost, recommended),
  };
}

export interface CostChange {
  previous: number;
  current: number;
  diff: number;
  /** 변동률(%) */
  rate: number;
  direction: 'up' | 'down' | 'same';
  at: string;
}

/** 원가 변동 정보 (직전 기록 대비) */
export function computeCostChange(history: { cost: number; at: string }[]): CostChange | null {
  if (!history || history.length < 2) return null;
  const current = history[history.length - 1];
  const previous = history[history.length - 2];
  const diff = roundWon(current.cost - previous.cost);
  if (diff === 0) return null;
  const rate = previous.cost > 0 ? roundTo((diff / previous.cost) * 100, 1) : 0;
  return {
    previous: previous.cost,
    current: current.cost,
    diff,
    rate,
    direction: diff > 0 ? 'up' : 'down',
    at: current.at,
  };
}
