import {
  computeCostChange,
  computeCostRate,
  computeItemCost,
  computeMarginAmount,
  computeRecipeCost,
  costRateLevel,
  syncMenuItems,
  type CostChange,
  type CostRateLevel,
} from './cost';
import type { Ingredient, Menu, RecipeItem } from './types';

export interface RecipeLineView {
  item: RecipeItem;
  cost: number;
}

export interface MenuView {
  menu: Menu;
  /** 재료 최신 가격이 반영된 항목 */
  items: RecipeItem[];
  lines: RecipeLineView[];
  cost: number;
  costRate: number | null;
  level: CostRateLevel | null;
  margin: number | null;
  change: CostChange | null;
}

/** 목록/대시보드에서 공통으로 쓰는 메뉴 표시용 계산 결과 */
export function buildMenuView(menu: Menu, ingredients: Map<string, Ingredient>): MenuView {
  const items = syncMenuItems(menu, ingredients);
  const cost = computeRecipeCost(items);
  const costRate = computeCostRate(cost, menu.sellingPrice);
  return {
    menu,
    items,
    lines: items.map((item) => ({ item, cost: computeItemCost(item) })),
    cost,
    costRate,
    level: costRateLevel(costRate),
    margin: computeMarginAmount(cost, menu.sellingPrice),
    change: computeCostChange(menu.costHistory),
  };
}
