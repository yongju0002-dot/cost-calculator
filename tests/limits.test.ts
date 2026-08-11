/**
 * 무료 요금제 한도 검증.
 *   npx tsx tests/limits.test.ts
 */
import { FREE_PLAN_LIMITS, limitStatus, limitReachedMessage } from '../src/lib/domain/limits.ts';

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

eq('기획서 한도값', FREE_PLAN_LIMITS, { ingredients: 100, preps: 20, menus: 20, supplies: 20 });

eq('한도 미만', limitStatus('ingredients', 99), {
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

eq('안내 문구', limitReachedMessage('menus'), '무료 요금제에서는 메뉴를 최대 20개까지 등록할 수 있습니다.');

console.log(failed === 0 ? '\n모든 테스트 통과' : `\n실패 ${failed}건`);
if (failed > 0) process.exit(1);
