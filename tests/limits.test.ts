/**
 * 요금제 한도 검증.
 *   npx tsx tests/limits.test.ts
 */
import { PLAN_LIMITS, limitStatus, limitReachedMessage } from '../src/lib/domain/limits.ts';

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

eq('FREE 한도값 (기존과 동일하게 유지)', PLAN_LIMITS.FREE, {
  ingredients: 100,
  preps: 20,
  menus: 20,
  supplies: 20,
});

eq('한도 미만 (plan 생략 시 FREE)', limitStatus('ingredients', 99), {
  target: 'ingredients',
  count: 99,
  max: 100,
  remaining: 1,
  atLimit: false,
});
eq('한도 도달', limitStatus('ingredients', 100).atLimit, true);
eq('한도 초과(이미 넘은 상태)', limitStatus('ingredients', 105), {
  target: 'ingredients',
  count: 105,
  max: 100,
  remaining: 0,
  atLimit: true,
});
eq('0개일 때 남은 개수', limitStatus('menus', 0).remaining, 20);
eq('프렙 한도 19->도달 아님', limitStatus('preps', 19).atLimit, false);
eq('프렙 한도 20->도달', limitStatus('preps', 20).atLimit, true);
eq('부자재 한도', limitStatus('supplies', 20).atLimit, true);

// 요금제별로 다른 한도가 적용되는지 (지금은 실제로 아무 계정도 PRO 가 될 수 없지만, 구조 검증)
eq('PRO 는 FREE 보다 넉넉함', limitStatus('ingredients', 150, 'PRO').atLimit, false);
eq('PRO 도 한도가 있음', limitStatus('ingredients', 500, 'PRO').atLimit, true);
eq('BUSINESS 재료 한도', PLAN_LIMITS.BUSINESS.ingredients, 2000);

eq(
  '안내 문구',
  limitReachedMessage('menus'),
  'FREE 플랜의 등록 한도에 도달했습니다. 무료 플랜에서는 최대 20개의 메뉴를 등록할 수 있습니다.',
);

console.log(failed === 0 ? '\n모든 테스트 통과' : `\n실패 ${failed}건`);
if (failed > 0) process.exit(1);
