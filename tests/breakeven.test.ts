/**
 * 손익분기점 계산 검증.
 *   npx tsx tests/breakeven.test.ts
 */
import {
  DEFAULT_OPERATING_DAYS,
  breakevenSummary,
  breakevenUnits,
  contributionMargin,
  contributionMarginRate,
  fixedCostByCategory,
  menuBreakeven,
  normalizeOperatingDays,
  totalFixedCost,
} from '../src/lib/domain/breakeven.ts';
import type { FixedCost } from '../src/lib/domain/types.ts';

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

function cost(name: string, amount: number, category: FixedCost['category']): FixedCost {
  return {
    id: name,
    ownerId: 'guest',
    name,
    amount,
    category,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const FIXED: FixedCost[] = [
  cost('임대료', 2_000_000, '임대료'),
  cost('직원 급여', 3_000_000, '인건비'),
  cost('전기·가스', 400_000, '공과금'),
  cost('보험료', 100_000, '기타'),
];

// ── 고정비 합계 ──────────────────────────────────────────
eq('고정비 합계', totalFixedCost(FIXED), 5_500_000);
eq('빈 목록은 0', totalFixedCost([]), 0);
eq(
  '분류별 합계',
  Object.fromEntries(fixedCostByCategory(FIXED)),
  { 임대료: 2_000_000, 인건비: 3_000_000, 공과금: 400_000, 기타: 100_000 },
);
eq(
  '같은 분류는 합쳐진다',
  Object.fromEntries(fixedCostByCategory([cost('알바', 100, '인건비'), cost('주방장', 200, '인건비')])),
  { 인건비: 300 },
);

// ── 공헌이익 ─────────────────────────────────────────────
eq('공헌이익 (12000원 - 원가 3240원)', contributionMargin(12_000, 3_240), 8_760);
eq('공헌이익률', contributionMarginRate(12_000, 3_240), 73);
eq('판매가가 없으면 계산 불가', contributionMargin(0, 3_240), null);
eq('원가가 판매가보다 크면 음수', contributionMargin(3_000, 5_000), -2_000);

// ── 필요 판매량 ──────────────────────────────────────────
eq('필요 판매량 (고정비 5,500,000 ÷ 공헌이익 8,760)', breakevenUnits(5_500_000, 8_760), 628);
eq('나누어떨어지지 않으면 올림', breakevenUnits(1_000, 300), 4);
eq('고정비가 0이면 0개', breakevenUnits(0, 8_760), 0);
eq('팔수록 손해면 계산 불가(null)', breakevenUnits(5_500_000, -2_000), null);
eq('공헌이익이 0이어도 계산 불가', breakevenUnits(5_500_000, 0), null);

// ── 메뉴별 손익분기 ──────────────────────────────────────
const 제육 = menuBreakeven(
  { menuId: 'm1', name: '제육볶음', sellingPrice: 12_000, cost: 3_240 },
  5_500_000,
  25,
);
eq('메뉴 공헌이익', 제육.margin, 8_760);
eq('메뉴 월 필요 판매량', 제육.monthlyUnits, 628);
eq('메뉴 하루 필요 판매량 (628 ÷ 25, 올림)', 제육.dailyUnits, 26);
eq('정상 메뉴는 losing=false', 제육.losing, false);

const 손해메뉴 = menuBreakeven(
  { menuId: 'm2', name: '적자메뉴', sellingPrice: 3_000, cost: 5_000 },
  5_500_000,
  25,
);
eq('적자 메뉴는 losing=true', 손해메뉴.losing, true);
eq('적자 메뉴는 판매량 계산 불가', 손해메뉴.monthlyUnits, null);
eq('적자 메뉴는 하루 판매량도 null', 손해메뉴.dailyUnits, null);

// ── 영업일수 보정 ────────────────────────────────────────
eq('기본 영업일수', DEFAULT_OPERATING_DAYS, 26);
eq('값이 없으면 기본값', normalizeOperatingDays(undefined), 26);
eq('소수는 반올림', normalizeOperatingDays(25.6), 26);
eq('0 이하는 1로', normalizeOperatingDays(0), 1);
eq('31 초과는 31로', normalizeOperatingDays(99), 31);
eq('NaN 은 기본값', normalizeOperatingDays(Number.NaN), 26);

// ── 전체 손익분기 매출 ───────────────────────────────────
const summary = breakevenSummary(
  [
    { sellingPrice: 12_000, cost: 3_240 }, // 공헌이익률 73%
    { sellingPrice: 10_000, cost: 3_000 }, // 공헌이익률 70%
  ],
  5_500_000,
  25,
);
eq('평균 공헌이익률', summary.averageMarginRate, 71.5);
eq('월 손익분기 매출 (5,500,000 ÷ 0.715)', summary.monthlyRevenue, 7_692_308);
eq('하루 필요 매출 (÷ 25, 올림)', summary.dailyRevenue, 307_693);
eq('계산에 쓴 메뉴 수', summary.menuCount, 2);
eq('영업일수가 요약에 반영된다', summary.operatingDays, 25);

const noMenus = breakevenSummary([], 5_500_000, 26);
eq('메뉴가 없으면 평균률 null', noMenus.averageMarginRate, null);
eq('메뉴가 없으면 매출도 null', noMenus.monthlyRevenue, null);

// 판매가가 0인 메뉴는 평균에서 빠져야 한다 (0원 메뉴가 평균을 끌어내리면 안 된다)
const withUnpriced = breakevenSummary(
  [
    { sellingPrice: 12_000, cost: 3_240 },
    { sellingPrice: 0, cost: 1_000 },
  ],
  5_500_000,
  26,
);
eq('판매가 없는 메뉴는 평균에서 제외', withUnpriced.averageMarginRate, 73);
eq('판매가 없는 메뉴는 개수에서도 제외', withUnpriced.menuCount, 1);

// 전부 적자면 손익분기 매출이 존재하지 않는다
const allLosing = breakevenSummary([{ sellingPrice: 3_000, cost: 5_000 }], 5_500_000, 26);
eq('전부 적자면 매출 계산 불가', allLosing.monthlyRevenue, null);
eq('전부 적자면 평균률도 null', allLosing.averageMarginRate, null);
eq('제외된 메뉴 수', allLosing.excludedCount, 1);

/*
 * 적자 메뉴는 평균에서 빼야 한다.
 *
 * 그냥 평균 내면 73% 와 -66.7% 가 섞여 3.1% 가 되고, 본전 매출이 274만원 대신
 * 6,451만원으로 나온다. 적자 메뉴는 팔아도 고정비에 보탬이 안 되므로 분모에서 뺀다.
 */
const withLosing = breakevenSummary(
  [
    { sellingPrice: 12_000, cost: 3_240 }, // 73%
    { sellingPrice: 3_000, cost: 5_000 }, // -66.7% → 제외
  ],
  2_000_000,
  25,
);
eq('적자 메뉴는 평균에서 제외', withLosing.averageMarginRate, 73);
eq('적자 메뉴 제외 개수', withLosing.excludedCount, 1);
eq('평균에 쓴 메뉴 수', withLosing.menuCount, 1);
eq('본전 매출이 뻥튀기되지 않는다', withLosing.monthlyRevenue, 2_739_727);

console.log(failed === 0 ? '\n모든 테스트 통과' : `\n${failed}개 실패`);
if (failed > 0) process.exit(1);
