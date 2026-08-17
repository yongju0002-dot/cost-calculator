/**
 * 시세 품목 ↔ 내 재료 이름 맞추기 검증.
 *   npx tsx tests/marketMatch.test.ts
 */
import { isSameProduct, matchingIngredients } from '../src/app/prices/marketMatch.ts';

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

// 맞아야 하는 경우
eq('양파 = 양파', isSameProduct('양파', '양파'), true);
eq('양파 = 자색양파', isSameProduct('양파', '자색양파'), true);
eq('양파 = 양파 (국산)', isSameProduct('양파', '양파 (국산)'), true);
eq('돼지 앞다리 = 돼지고기 앞다리살', isSameProduct('돼지 앞다리', '돼지고기 앞다리살'), true);
eq('돼지 삼겹살 = 국내산 돼지 삼겹살', isSameProduct('돼지 삼겹살', '국내산 돼지 삼겹살'), true);
eq('깐마늘(국산) = 깐마늘', isSameProduct('깐마늘(국산)', '깐마늘'), true);
eq('느타리버섯 = 느타리버섯', isSameProduct('느타리버섯', '느타리버섯'), true);

// 틀려야 하는 경우
eq('양파 ≠ 대파', isSameProduct('양파', '대파'), false);
eq('파 ≠ 양파 (한 글자 품목)', isSameProduct('파', '양파'), false);
eq('파 ≠ 파프리카', isSameProduct('파', '파프리카'), false);
eq('파 = 파 (정확히 같을 때만)', isSameProduct('파', '파'), true);
eq('돼지 앞다리 ≠ 돼지고기 삼겹살', isSameProduct('돼지 앞다리', '돼지고기 삼겹살'), false);
eq('배추 ≠ 배', isSameProduct('배추', '배'), false);
eq('빈 재료명', isSameProduct('양파', ''), false);

// 목록에서 골라내기
eq(
  '목록 매칭',
  matchingIngredients('돼지 앞다리', ['돼지고기 앞다리살', '양파', '돼지고기 삼겹살', '앞다리 수입']),
  ['돼지고기 앞다리살'],
);
eq('매칭 없음', matchingIngredients('전복', ['양파', '대파']), []);

console.log(failed === 0 ? '\n모든 테스트 통과' : `\n실패 ${failed}건`);
if (failed > 0) process.exit(1);
