import { roundTo, roundWon, ceilTo } from './money';
import { baseUnitOf, isConvertible, toBaseAmount, type Unit } from './units';
import type {
  Ingredient,
  Menu,
  Prep,
  PricingMode,
  PurchaseRecord,
  RecipeItem,
  Supply,
} from './types';

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

// ─────────────────────────────────────────────────────────
// 프렙 (미리 만들어두는 양념장·육수 등)
// ─────────────────────────────────────────────────────────

/** 프렙 안의 재료들을 최신 가격으로 맞춘다. */
export function syncPrepItems(prep: Prep, ingredients: Map<string, Ingredient>): RecipeItem[] {
  return (prep.items ?? []).map((item) => syncItemWithIngredient(item, ingredients));
}

/** 프렙 한 통을 만드는 데 드는 총 재료 원가 */
export function computePrepCost(prep: Prep, ingredients: Map<string, Ingredient>): number {
  return computeRecipeCost(syncPrepItems(prep, ingredients));
}

/**
 * 프렙의 단위 원가.
 * 예) 총원가 3,200원 / 생산량 2kg -> 1.6원/g (= 100g당 160원)
 */
export function prepUnitCost(prep: Prep, ingredients: Map<string, Ingredient>): UnitCost | null {
  return computeUnitCost(computePrepCost(prep, ingredients), prep.yieldAmount, prep.yieldUnit);
}

/**
 * 메뉴에서 프렙을 쓸 때 필요한 기준 값.
 * 재료와 동일하게 price ÷ quantity 로 단위 원가가 나오도록 맞춰준다.
 */
export function prepSnapshot(
  prep: Prep,
  ingredients: Map<string, Ingredient>,
): { price: number; quantity: number; unit: Unit } {
  return {
    price: computePrepCost(prep, ingredients),
    quantity: prep.yieldAmount,
    unit: prep.yieldUnit,
  };
}

// ─────────────────────────────────────────────────────────
// 메뉴 (재료 + 프렙 + 부자재 + 기타)
// ─────────────────────────────────────────────────────────

/** 원가 계산에 필요한 저장 데이터 묶음 */
export interface CostSources {
  ingredients: Map<string, Ingredient>;
  preps?: Map<string, Prep>;
  supplies?: Map<string, Supply>;
}

/** 재료·프렙·부자재의 최신 가격을 레시피 한 줄에 반영한다. */
export function syncRecipeItem(item: RecipeItem, sources: CostSources): RecipeItem {
  if (item.kind === 'ingredient') {
    return syncItemWithIngredient(item, sources.ingredients);
  }
  if (item.kind === 'prep') {
    const prep = item.prepId ? sources.preps?.get(item.prepId) : undefined;
    if (!prep) return item;
    return { ...item, name: prep.name, ...prepSnapshot(prep, sources.ingredients) };
  }
  if (item.kind === 'supply') {
    const supply = item.supplyId ? sources.supplies?.get(item.supplyId) : undefined;
    if (!supply) return item;
    return {
      ...item,
      name: supply.name,
      price: supply.price,
      quantity: supply.quantity,
      unit: supply.unit,
    };
  }
  return item;
}

export function syncMenuItems(menu: Menu, sources: CostSources): RecipeItem[] {
  return menu.items.map((item) => syncRecipeItem(item, sources));
}

export function computeMenuCost(menu: Menu, sources: CostSources): number {
  return computeRecipeCost(syncMenuItems(menu, sources));
}

/** 원가를 구성 요소별로 나눈 값 */
export interface CostBreakdown {
  ingredient: number;
  prep: number;
  supply: number;
  manual: number;
  total: number;
}

export function computeCostBreakdown(items: RecipeItem[]): CostBreakdown {
  const breakdown: CostBreakdown = { ingredient: 0, prep: 0, supply: 0, manual: 0, total: 0 };
  for (const item of items) {
    const cost = computeItemCost(item);
    breakdown[item.kind] += cost;
    breakdown.total += cost;
  }
  return breakdown;
}

/** 구성 요소별 비율(%) — 원가 구성 그래프에 쓴다. */
export function breakdownRatio(breakdown: CostBreakdown, key: keyof CostBreakdown): number {
  if (breakdown.total <= 0) return 0;
  return roundTo((breakdown[key] / breakdown.total) * 100, 1);
}

// ─────────────────────────────────────────────────────────
// 매입가 이력
// ─────────────────────────────────────────────────────────

/** 특정 재료·부자재의 매입 기록만 골라 최신순으로 정렬한다. */
export function purchasesOf(
  purchases: PurchaseRecord[],
  targetType: 'ingredient' | 'supply',
  targetId: string,
): PurchaseRecord[] {
  return purchases
    .filter((p) => p.targetType === targetType && p.targetId === targetId)
    .sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : a.purchasedAt > b.purchasedAt ? -1 : 0));
}

/** 매입 기록 하나의 기준 단위당 가격 */
export function purchaseUnitCost(record: {
  amount: number;
  quantity: number;
  unit: Unit;
}): number {
  const unitCost = computeUnitCost(record.amount, record.quantity, record.unit);
  return unitCost ? unitCost.value : 0;
}

/**
 * 가격 기준에 따라 실제로 적용할 구매가격/구매수량을 정한다.
 * 반환값이 null 이면 기존에 입력된 가격을 그대로 쓴다.
 */
export function resolvePriceByMode(
  mode: PricingMode | undefined,
  records: PurchaseRecord[],
): { price: number; quantity: number; unit: Unit } | null {
  if (!mode || mode === 'manual') return null;
  const sorted = [...records].sort((a, b) =>
    a.purchasedAt < b.purchasedAt ? -1 : a.purchasedAt > b.purchasedAt ? 1 : 0,
  );
  if (sorted.length === 0) return null;

  if (mode === 'latest') {
    const latest = sorted[sorted.length - 1];
    return { price: latest.amount, quantity: latest.quantity, unit: latest.unit };
  }

  // 평균: 단위가 섞여 있어도 되도록 기준 단위로 환산해 총액 ÷ 총수량으로 구한다.
  const baseUnit = baseUnitOf(sorted[sorted.length - 1].unit);
  let totalAmount = 0;
  let totalBaseQuantity = 0;
  for (const record of sorted) {
    if (baseUnitOf(record.unit) !== baseUnit) continue;
    totalAmount += record.amount;
    totalBaseQuantity += toBaseAmount(record.quantity, record.unit);
  }
  if (totalBaseQuantity <= 0) return null;
  return { price: roundTo(totalAmount, 2), quantity: totalBaseQuantity, unit: baseUnit };
}

/** 매입 이력 기준으로 재료·부자재의 현재 적용 가격을 갱신한다. */
export function applyPricingMode<T extends Ingredient | Supply>(
  target: T,
  purchases: PurchaseRecord[],
  targetType: 'ingredient' | 'supply',
): T {
  const resolved = resolvePriceByMode(
    target.pricingMode,
    purchasesOf(purchases, targetType, target.id),
  );
  if (!resolved) return target;
  if (
    target.price === resolved.price &&
    target.quantity === resolved.quantity &&
    target.unit === resolved.unit
  ) {
    return target;
  }
  return { ...target, ...resolved };
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
