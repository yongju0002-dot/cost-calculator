import { applyThousandSeparator, parseNumberInput } from '@/lib/domain/money';
import type { Ingredient, Menu, Prep, RecipeItem, RecipeItemKind, Supply } from '@/lib/domain/types';
import { baseUnitOf, isConvertible, type Unit } from '@/lib/domain/units';
import { createId } from '@/lib/storage/local';
import { DEFAULT_CATEGORY } from '@/lib/domain/categories';

/**
 * 계산기 화면의 입력 상태.
 * 사용자가 입력 중인 값(콤마, 빈 문자열)을 그대로 보존하기 위해 문자열로 다룬다.
 */
export interface DraftItem {
  id: string;
  kind: RecipeItemKind;
  ingredientId: string | null;
  /** kind === 'prep' 일 때 연결된 프렙 */
  prepId?: string | null;
  /** kind === 'supply' 일 때 연결된 부자재 */
  supplyId?: string | null;
  name: string;
  price: string;
  quantity: string;
  unit: Unit;
  amount: string;
  amountUnit: Unit;
  manualCost: string;
}

export interface Draft {
  menuId: string | null;
  name: string;
  category: string;
  items: DraftItem[];
  sellingPrice: string;
  targetRate: string;
}

export function createIngredientRow(): DraftItem {
  return {
    id: createId('row'),
    kind: 'ingredient',
    ingredientId: null,
    name: '',
    price: '',
    quantity: '',
    unit: 'g',
    amount: '',
    amountUnit: 'g',
    manualCost: '',
  };
}

export function createManualRow(name = '기타 비용'): DraftItem {
  return {
    ...createIngredientRow(),
    kind: 'manual',
    name,
  };
}

export function createEmptyDraft(): Draft {
  return {
    menuId: null,
    name: '',
    category: DEFAULT_CATEGORY,
    items: [createIngredientRow(), createIngredientRow()],
    sellingPrice: '',
    targetRate: '30',
  };
}

export function rowFromIngredient(ingredient: Ingredient, previous?: DraftItem): DraftItem {
  // 단위 계열이 달라지면(예: g -> 개) 기존 사용량은 의미가 없으므로 비운다.
  const keepAmount = Boolean(previous && isConvertible(ingredient.unit, previous.amountUnit));
  const amountUnit = keepAmount ? previous!.amountUnit : baseUnitOf(ingredient.unit);
  return {
    id: previous?.id ?? createId('row'),
    kind: 'ingredient',
    ingredientId: ingredient.id,
    name: ingredient.name,
    price: applyThousandSeparator(String(ingredient.price)),
    quantity: applyThousandSeparator(String(ingredient.quantity)),
    unit: ingredient.unit,
    amount: keepAmount ? previous!.amount : '',
    amountUnit,
    manualCost: '',
  };
}

/**
 * 프렙을 메뉴에 넣을 때의 입력 행.
 * 프렙 총원가 ÷ 총생산량 = 단위 원가가 되도록 재료와 같은 형태로 맞춘다.
 */
export function rowFromPrep(
  prep: Prep,
  prepCost: number,
  previous?: DraftItem,
): DraftItem {
  const keepAmount = Boolean(previous && isConvertible(prep.yieldUnit, previous.amountUnit));
  return {
    id: previous?.id ?? createId('row'),
    kind: 'prep',
    ingredientId: null,
    prepId: prep.id,
    name: prep.name,
    price: applyThousandSeparator(String(prepCost)),
    quantity: applyThousandSeparator(String(prep.yieldAmount)),
    unit: prep.yieldUnit,
    amount: keepAmount ? previous!.amount : '',
    amountUnit: keepAmount ? previous!.amountUnit : baseUnitOf(prep.yieldUnit),
    manualCost: '',
  };
}

/** 부자재를 메뉴에 넣을 때의 입력 행 */
export function rowFromSupply(supply: Supply, previous?: DraftItem): DraftItem {
  const keepAmount = Boolean(previous && isConvertible(supply.unit, previous.amountUnit));
  return {
    id: previous?.id ?? createId('row'),
    kind: 'supply',
    ingredientId: null,
    supplyId: supply.id,
    name: supply.name,
    price: applyThousandSeparator(String(supply.price)),
    quantity: applyThousandSeparator(String(supply.quantity)),
    unit: supply.unit,
    // 부자재는 보통 1개씩 쓰므로 기본값을 1로 채워준다.
    amount: keepAmount ? previous!.amount : '1',
    amountUnit: keepAmount ? previous!.amountUnit : baseUnitOf(supply.unit),
    manualCost: '',
  };
}

const KIND_FALLBACK_NAME: Record<RecipeItemKind, string> = {
  ingredient: '이름 없는 재료',
  prep: '이름 없는 프렙',
  supply: '이름 없는 부자재',
  manual: '기타 비용',
};

/** 입력 상태 -> 계산/저장용 데이터 */
export function toRecipeItem(row: DraftItem): RecipeItem {
  return {
    id: row.id,
    kind: row.kind,
    ingredientId: row.ingredientId,
    prepId: row.prepId ?? null,
    supplyId: row.supplyId ?? null,
    name: row.name.trim() || KIND_FALLBACK_NAME[row.kind],
    price: parseNumberInput(row.price) ?? 0,
    quantity: parseNumberInput(row.quantity) ?? 0,
    unit: row.unit,
    amount: parseNumberInput(row.amount) ?? 0,
    amountUnit: row.amountUnit,
    manualCost: parseNumberInput(row.manualCost) ?? 0,
  };
}

export function toRecipeItems(rows: DraftItem[]): RecipeItem[] {
  return rows.map(toRecipeItem);
}

/** 저장된 메뉴 -> 입력 상태 */
export function draftFromMenu(menu: Menu, items: RecipeItem[]): Draft {
  return {
    menuId: menu.id,
    name: menu.name,
    category: menu.category,
    sellingPrice: menu.sellingPrice ? applyThousandSeparator(String(menu.sellingPrice)) : '',
    targetRate: '30',
    items: items.map((item) => ({
      id: item.id,
      kind: item.kind,
      ingredientId: item.ingredientId,
      prepId: item.prepId ?? null,
      supplyId: item.supplyId ?? null,
      name: item.name,
      price: item.price ? applyThousandSeparator(String(item.price)) : '',
      quantity: item.quantity ? applyThousandSeparator(String(item.quantity)) : '',
      unit: item.unit,
      amount: item.amount ? applyThousandSeparator(String(item.amount)) : '',
      amountUnit: item.amountUnit,
      manualCost: item.manualCost ? applyThousandSeparator(String(item.manualCost)) : '',
    })),
  };
}

export interface RowIssue {
  field: 'name' | 'price' | 'quantity' | 'amount' | 'manualCost';
  message: string;
}

/** 한 줄에 대한 친절한 오류 메시지 */
export function validateRow(row: DraftItem): RowIssue[] {
  const issues: RowIssue[] = [];
  if (row.kind === 'manual') {
    const cost = parseNumberInput(row.manualCost);
    if (cost === null) issues.push({ field: 'manualCost', message: '금액을 입력해주세요.' });
    else if (cost < 0) issues.push({ field: 'manualCost', message: '금액은 0원 이상이어야 합니다.' });
    return issues;
  }

  const price = parseNumberInput(row.price);
  const quantity = parseNumberInput(row.quantity);
  const amount = parseNumberInput(row.amount);

  if (!row.name.trim()) issues.push({ field: 'name', message: '재료명을 입력해주세요.' });
  if (price === null) issues.push({ field: 'price', message: '구매가격을 입력해주세요.' });
  else if (price <= 0) issues.push({ field: 'price', message: '구매가격은 0원보다 커야 합니다.' });
  if (quantity === null) issues.push({ field: 'quantity', message: '구매수량을 입력해주세요.' });
  else if (quantity <= 0) issues.push({ field: 'quantity', message: '구매수량은 0보다 커야 합니다.' });
  if (amount === null) issues.push({ field: 'amount', message: '사용량을 입력해주세요.' });
  else if (amount <= 0) issues.push({ field: 'amount', message: '사용량은 0보다 커야 합니다.' });

  return issues;
}

/** 아직 아무것도 입력하지 않은 줄인지 (빈 줄은 검증에서 제외한다) */
export function isRowEmpty(row: DraftItem): boolean {
  if (row.kind === 'manual') return !row.name.trim() && !row.manualCost.trim();
  return (
    !row.name.trim() && !row.price.trim() && !row.quantity.trim() && !row.amount.trim()
  );
}

export function hasUsableRow(rows: DraftItem[]): boolean {
  return rows.some((row) => !isRowEmpty(row) && validateRow(row).length === 0);
}
