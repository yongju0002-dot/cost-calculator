/**
 * 계산 로직 검증 스크립트.
 *   npm test
 * (Node 24 의 TypeScript 실행 기능을 사용하므로 별도 빌드가 필요 없다.)
 */
import {
  computeUnitCost,
  computeItemCost,
  computeRecipeCost,
  computeCostRate,
  computeMarginAmount,
  computeSuggestedPrice,
  costRateLevel,
  computeCostChange,
  computePrepCost,
  prepUnitCost,
  prepSnapshot,
  computeCostBreakdown,
  breakdownRatio,
  syncRecipeItem,
  resolvePriceByMode,
  purchasesOf,
} from '../src/lib/domain/cost.ts';
import {
  roundTo,
  formatWon,
  formatPercent,
  formatUnitCost,
  parseNumberInput,
  applyThousandSeparator,
} from '../src/lib/domain/money.ts';
import type {
  Ingredient,
  Prep,
  PurchaseRecord,
  RecipeItem,
  Supply,
} from '../src/lib/domain/types.ts';

let failed = 0;
function eq(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${JSON.stringify(actual)}${
      ok ? '' : ` (기대값 ${JSON.stringify(expected)})`
    }`,
  );
}

// 단위 원가
eq('45,000원 / 5kg', computeUnitCost(45000, 5, 'kg')?.value, 9);
eq('8,000원 / 30개', formatUnitCost(computeUnitCost(8000, 30, '개')!.value), '267');
eq('3,000원 / 2kg', formatUnitCost(computeUnitCost(3000, 2, 'kg')!.value), '1.5');
eq('구매수량 0', computeUnitCost(1000, 0, 'g'), null);
eq('음수 가격', computeUnitCost(-100, 1, 'kg'), null);

const row = (over: Partial<RecipeItem>): RecipeItem => ({
  id: 'x',
  kind: 'ingredient',
  ingredientId: null,
  prepId: null,
  supplyId: null,
  name: 'x',
  price: 0,
  quantity: 0,
  unit: 'g',
  amount: 0,
  amountUnit: 'g',
  manualCost: 0,
  ...over,
});

// 제육볶음 (기획 예시)
const items: RecipeItem[] = [
  row({ name: '돼지고기', price: 45000, quantity: 5, unit: 'kg', amount: 200, amountUnit: 'g' }),
  row({ name: '양파', price: 3000, quantity: 2, unit: 'kg', amount: 100, amountUnit: 'g' }),
  row({ name: '고추장', price: 30000, quantity: 3, unit: 'kg', amount: 30, amountUnit: 'g' }),
  row({ name: '고춧가루', price: 15000, quantity: 1, unit: 'kg', amount: 10, amountUnit: 'g' }),
  row({ name: '설탕', price: 6000, quantity: 3, unit: 'kg', amount: 10, amountUnit: 'g' }),
  row({ kind: 'manual', name: '기타', manualCost: 500 }),
];
eq('줄별 금액', items.map(computeItemCost), [1800, 150, 300, 150, 20, 500]);
eq('총 재료 원가', computeRecipeCost(items), 2920);
eq('원가율', computeCostRate(2920, 12000), 24.3);
eq('원가율 표기', formatPercent(computeCostRate(2920, 12000)!), '24.3%');
eq('재료비 제외 금액', computeMarginAmount(2920, 12000), 9080);
eq('판매가격 0', computeCostRate(2920, 0), null);

// 원가율 단계
eq('29.9% 단계', costRateLevel(29.9)?.label, '낮음');
eq('30% 단계', costRateLevel(30)?.label, '보통');
eq('40% 단계', costRateLevel(40)?.label, '높음');
eq('55% 단계', costRateLevel(55)?.label, '매우 높음');

// 적정 판매가격
eq('3,000원 / 목표 30%', computeSuggestedPrice(3000, 30)?.recommended, 10000);
eq('2,920원 / 목표 30%', computeSuggestedPrice(2920, 30)?.recommended, 9800);
eq('목표 원가율 0', computeSuggestedPrice(3000, 0), null);

// 단위 환산
eq(
  '36,000원 18L 중 10ml',
  computeItemCost(row({ price: 36000, quantity: 18, unit: 'L', amount: 10, amountUnit: 'ml' })),
  20,
);
eq(
  '8,000원 30개 중 4개',
  computeItemCost(row({ price: 8000, quantity: 30, unit: '개', amount: 4, amountUnit: '개' })),
  1067,
);
eq(
  '12,000원 10팩 중 0.5팩',
  computeItemCost(row({ price: 12000, quantity: 10, unit: '팩', amount: 0.5, amountUnit: '팩' })),
  600,
);
eq(
  '환산 불가 단위(개 재료를 g 로 사용)',
  computeItemCost(row({ price: 8000, quantity: 30, unit: '개', amount: 10, amountUnit: 'g' })),
  0,
);

// 부동소수점 처리
eq('0.1 + 0.2', roundTo(0.1 + 0.2, 2), 0.3);
eq('1.005 반올림', roundTo(1.005, 2), 1.01);
eq('2.675 반올림', roundTo(2.675, 2), 2.68);
eq('큰 금액 표기', formatWon(1234567.4), '1,234,567원');

// 입력 파싱
eq('콤마 파싱', parseNumberInput('12,000'), 12000);
eq('빈 입력', parseNumberInput(''), null);
eq('문자 입력', parseNumberInput('abc'), null);
eq('콤마 적용', applyThousandSeparator('1234567'), '1,234,567');
eq('소수점 입력 중', applyThousandSeparator('1234.'), '1,234.');

// 원가 변동
eq(
  '원가 상승',
  computeCostChange([
    { cost: 2800, at: 'a' },
    { cost: 3120, at: 'b' },
  ]),
  { previous: 2800, current: 3120, diff: 320, rate: 11.4, direction: 'up', at: 'b' },
);
eq('기록이 하나뿐', computeCostChange([{ cost: 2800, at: 'a' }]), null);

// ─────────────────────────────────────────────
// 프렙 · 부자재 · 매입가 이력
// ─────────────────────────────────────────────

const ing = (id: string, name: string, price: number, quantity: number, unit: Ingredient['unit']): Ingredient => ({
  id,
  ownerId: 'test',
  name,
  price,
  quantity,
  unit,
  priceHistory: [],
  createdAt: 'a',
  updatedAt: 'a',
});

// 기획 예시: 고추장 2,000원(500g) + 간장 900원(300ml) + 설탕 300원(200g) = 3,200원
const prepIngredients = new Map<string, Ingredient>([
  ['gochu', ing('gochu', '고추장', 2000, 500, 'g')],
  ['ganjang', ing('ganjang', '간장', 900, 300, 'ml')],
  ['sugar', ing('sugar', '설탕', 300, 200, 'g')],
]);

const sauce: Prep = {
  id: 'sauce',
  ownerId: 'test',
  name: '제육 양념장',
  items: [
    row({ kind: 'ingredient', ingredientId: 'gochu', price: 2000, quantity: 500, unit: 'g', amount: 500, amountUnit: 'g' }),
    row({ kind: 'ingredient', ingredientId: 'ganjang', price: 900, quantity: 300, unit: 'ml', amount: 300, amountUnit: 'ml' }),
    row({ kind: 'ingredient', ingredientId: 'sugar', price: 300, quantity: 200, unit: 'g', amount: 200, amountUnit: 'g' }),
  ],
  yieldAmount: 2,
  yieldUnit: 'kg',
  costHistory: [],
  createdAt: 'a',
  updatedAt: 'a',
};

eq('프렙 총원가', computePrepCost(sauce, prepIngredients), 3200);
eq('프렙 1g당 원가', prepUnitCost(sauce, prepIngredients)?.value, 1.6);
eq('프렙 100g당 원가', roundTo((prepUnitCost(sauce, prepIngredients)?.value ?? 0) * 100, 0), 160);
eq('프렙 스냅샷', prepSnapshot(sauce, prepIngredients), { price: 3200, quantity: 2, unit: 'kg' });

// 메뉴에서 프렙 80g 사용 -> 1.6원/g × 80 = 128원
const prepRow = row({ kind: 'prep', prepId: 'sauce', amount: 80, amountUnit: 'g' });
const syncedPrepRow = syncRecipeItem(prepRow, {
  ingredients: prepIngredients,
  preps: new Map([['sauce', sauce]]),
});
eq('메뉴에서 프렙 80g', computeItemCost(syncedPrepRow), 128);

// 부자재: 도시락 용기 100개 30,000원 -> 개당 300원
const container: Supply = {
  id: 'box',
  ownerId: 'test',
  name: '도시락 용기',
  price: 30000,
  quantity: 100,
  unit: '개',
  priceHistory: [],
  createdAt: 'a',
  updatedAt: 'a',
};
const supplyRow = syncRecipeItem(row({ kind: 'supply', supplyId: 'box', amount: 1, amountUnit: '개' }), {
  ingredients: new Map(),
  supplies: new Map([['box', container]]),
});
eq('부자재 1개 원가', computeItemCost(supplyRow), 300);

// 원가 구성: 식재료 3,000 + 프렙 500 + 부자재 400 = 3,900
const comboItems: RecipeItem[] = [
  row({ kind: 'ingredient', price: 3000, quantity: 1, unit: '개', amount: 1, amountUnit: '개' }),
  row({ kind: 'prep', price: 500, quantity: 1, unit: '개', amount: 1, amountUnit: '개' }),
  row({ kind: 'supply', price: 400, quantity: 1, unit: '개', amount: 1, amountUnit: '개' }),
];
const breakdown = computeCostBreakdown(comboItems);
eq('원가 구성 합계', breakdown.total, 3900);
eq('원가 구성 분해', [breakdown.ingredient, breakdown.prep, breakdown.supply], [3000, 500, 400]);
eq('원가율(구성 포함)', computeCostRate(breakdown.total, 12000), 32.5);
eq('예상 이익', computeMarginAmount(breakdown.total, 12000), 8100);
eq('식재료 비율', breakdownRatio(breakdown, 'ingredient'), 76.9);

// 매입가 이력
const buy = (id: string, at: string, quantity: number, amount: number): PurchaseRecord => ({
  id,
  ownerId: 'test',
  targetType: 'ingredient',
  targetId: 'pork',
  purchasedAt: at,
  quantity,
  unit: 'kg',
  amount,
  unitCost: amount / (quantity * 1000),
  createdAt: at,
});
const records = [buy('p1', '2026-07-01', 10, 90000), buy('p2', '2026-08-01', 10, 110000)];

eq('최근 매입가', resolvePriceByMode('latest', records), { price: 110000, quantity: 10, unit: 'kg' });
eq('평균 매입가', resolvePriceByMode('average', records), { price: 200000, quantity: 20000, unit: 'g' });
eq('평균 매입 단가(원/kg)', roundTo(200000 / 20, 0), 10000);
eq('직접 입력 기준은 이력 무시', resolvePriceByMode('manual', records), null);
eq('이력 없으면 null', resolvePriceByMode('latest', []), null);
eq('대상별 이력 필터(최신순)', purchasesOf(records, 'ingredient', 'pork').map((r) => r.id), ['p2', 'p1']);
eq('다른 대상은 제외', purchasesOf(records, 'supply', 'pork').length, 0);

// 가격 변동률: 9,000원/kg -> 11,000원/kg = +22.2%
eq(
  '매입가 변동률',
  roundTo(((110000 / 10 - 90000 / 10) / (90000 / 10)) * 100, 1),
  22.2,
);

console.log(failed === 0 ? '\n모든 테스트 통과' : `\n실패 ${failed}건`);
if (failed > 0) process.exit(1);
