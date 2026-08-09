import { computeRecipeCost } from './cost';
import type { Ingredient, Menu, RecipeItem } from './types';
import type { Unit } from './units';
import { createId } from '@/lib/storage/local';

/**
 * 처음 사용해 보는 사장님이 화면을 바로 이해할 수 있도록 하는 예시 데이터.
 * (실제 데이터와 동일한 구조라서 그대로 수정/삭제할 수 있다.)
 */

interface IngredientSpec {
  key: string;
  name: string;
  price: number;
  quantity: number;
  unit: Unit;
  /** 예전 가격 (가격 변동 이력 표시용) */
  previousPrice?: number;
}

interface ItemSpec {
  key?: string;
  amount?: number;
  amountUnit?: Unit;
  manual?: { name: string; cost: number };
}

interface MenuSpec {
  name: string;
  category: string;
  sellingPrice: number;
  items: ItemSpec[];
  /** 직전 원가 (원가 변동 표시용) */
  previousCost?: number;
}

const INGREDIENTS: IngredientSpec[] = [
  { key: 'pork', name: '돼지고기 앞다리살', price: 45000, quantity: 5, unit: 'kg', previousPrice: 40000 },
  { key: 'chicken', name: '닭고기', price: 8000, quantity: 1, unit: 'kg' },
  { key: 'onion', name: '양파', price: 3000, quantity: 2, unit: 'kg', previousPrice: 3130 },
  { key: 'potato', name: '감자', price: 4000, quantity: 2, unit: 'kg' },
  { key: 'greenOnion', name: '대파', price: 2000, quantity: 1, unit: 'kg' },
  { key: 'gochujang', name: '고추장', price: 30000, quantity: 3, unit: 'kg' },
  { key: 'pepperPowder', name: '고춧가루', price: 15000, quantity: 1, unit: 'kg' },
  { key: 'sugar', name: '설탕', price: 6000, quantity: 3, unit: 'kg' },
  { key: 'oil', name: '식용유', price: 36000, quantity: 18, unit: 'L', previousPrice: 33600 },
  { key: 'egg', name: '계란', price: 8000, quantity: 30, unit: '개' },
  { key: 'kimchi', name: '김치', price: 20000, quantity: 10, unit: 'kg' },
  { key: 'tofu', name: '두부', price: 12000, quantity: 10, unit: '팩' },
  { key: 'milk', name: '우유', price: 2400, quantity: 1, unit: 'L' },
  { key: 'coffeeBean', name: '원두', price: 30000, quantity: 1, unit: 'kg' },
];

const MENUS: MenuSpec[] = [
  {
    name: '제육볶음',
    category: '한식',
    sellingPrice: 12000,
    previousCost: 2620,
    items: [
      { key: 'pork', amount: 200, amountUnit: 'g' },
      { key: 'onion', amount: 100, amountUnit: 'g' },
      { key: 'gochujang', amount: 30, amountUnit: 'g' },
      { key: 'pepperPowder', amount: 10, amountUnit: 'g' },
      { key: 'sugar', amount: 10, amountUnit: 'g' },
      { manual: { name: '기타 양념·부재료', cost: 500 } },
    ],
  },
  {
    name: '김치찌개',
    category: '한식',
    sellingPrice: 9000,
    previousCost: 2160,
    items: [
      { key: 'pork', amount: 100, amountUnit: 'g' },
      { key: 'kimchi', amount: 200, amountUnit: 'g' },
      { key: 'tofu', amount: 0.5, amountUnit: '팩' },
      { key: 'greenOnion', amount: 30, amountUnit: 'g' },
      { manual: { name: '육수·양념', cost: 300 } },
    ],
  },
  {
    name: '닭볶음탕',
    category: '한식',
    sellingPrice: 11000,
    items: [
      { key: 'chicken', amount: 500, amountUnit: 'g' },
      { key: 'potato', amount: 200, amountUnit: 'g' },
      { key: 'onion', amount: 100, amountUnit: 'g' },
      { key: 'gochujang', amount: 20, amountUnit: 'g' },
      { key: 'pepperPowder', amount: 15, amountUnit: 'g' },
      { manual: { name: '기타 양념', cost: 300 } },
    ],
  },
  {
    name: '계란말이',
    category: '분식',
    sellingPrice: 6000,
    items: [
      { key: 'egg', amount: 4, amountUnit: '개' },
      { key: 'greenOnion', amount: 20, amountUnit: 'g' },
      { key: 'oil', amount: 10, amountUnit: 'ml' },
      { manual: { name: '포장·부재료', cost: 200 } },
    ],
  },
  {
    name: '카페라떼',
    category: '카페',
    sellingPrice: 4500,
    previousCost: 1140,
    items: [
      { key: 'coffeeBean', amount: 18, amountUnit: 'g' },
      { key: 'milk', amount: 200, amountUnit: 'ml' },
      { manual: { name: '컵·뚜껑·빨대', cost: 150 } },
    ],
  },
];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function createSampleData(ownerId: string): { ingredients: Ingredient[]; menus: Menu[] } {
  const byKey = new Map<string, Ingredient>();

  const ingredients = INGREDIENTS.map((spec, index) => {
    const createdAt = daysAgo(30 - index);
    const ingredient: Ingredient = {
      id: createId('ing'),
      ownerId,
      name: spec.name,
      price: spec.price,
      quantity: spec.quantity,
      unit: spec.unit,
      priceHistory: [
        ...(spec.previousPrice
          ? [
              {
                price: spec.previousPrice,
                quantity: spec.quantity,
                unit: spec.unit,
                unitCost: spec.previousPrice / spec.quantity,
                at: daysAgo(9),
              },
            ]
          : []),
        {
          price: spec.price,
          quantity: spec.quantity,
          unit: spec.unit,
          unitCost: spec.price / spec.quantity,
          at: spec.previousPrice ? daysAgo(2) : createdAt,
        },
      ],
      createdAt,
      updatedAt: spec.previousPrice ? daysAgo(2) : createdAt,
    };
    byKey.set(spec.key, ingredient);
    return ingredient;
  });

  const menus = MENUS.map((spec, index) => {
    const items: RecipeItem[] = spec.items.map((itemSpec) => {
      if (itemSpec.manual) {
        return {
          id: createId('item'),
          kind: 'manual',
          ingredientId: null,
          name: itemSpec.manual.name,
          price: 0,
          quantity: 0,
          unit: 'g',
          amount: 0,
          amountUnit: 'g',
          manualCost: itemSpec.manual.cost,
        };
      }
      const ingredient = byKey.get(itemSpec.key!)!;
      return {
        id: createId('item'),
        kind: 'ingredient',
        ingredientId: ingredient.id,
        name: ingredient.name,
        price: ingredient.price,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        amount: itemSpec.amount ?? 0,
        amountUnit: itemSpec.amountUnit ?? ingredient.unit,
        manualCost: 0,
      };
    });

    const cost = computeRecipeCost(items);
    const createdAt = daysAgo(20 - index);

    return {
      id: createId('menu'),
      ownerId,
      name: spec.name,
      category: spec.category,
      items,
      sellingPrice: spec.sellingPrice,
      costHistory: [
        ...(spec.previousCost ? [{ cost: spec.previousCost, at: daysAgo(9) }] : []),
        { cost, at: spec.previousCost ? daysAgo(2) : createdAt },
      ],
      createdAt,
      updatedAt: createdAt,
    } satisfies Menu;
  });

  return { ingredients, menus };
}
