/**
 * 시세 즐겨찾기 토글 로직 검증.
 *   npx tsx tests/favorites.test.ts
 */
import { toggleFavorite } from '../src/app/prices/favorites.ts';

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

eq('빈 목록에 추가', toggleFavorite([], 'a'), ['a']);
eq('이미 있으면 제거', toggleFavorite(['a', 'b'], 'a'), ['b']);
eq('없으면 뒤에 추가', toggleFavorite(['a'], 'b'), ['a', 'b']);
eq('마지막 하나 제거하면 빈 목록', toggleFavorite(['a'], 'a'), []);
eq('원본 배열은 그대로', (() => {
  const src = ['a'];
  toggleFavorite(src, 'b');
  return src;
})(), ['a']);

console.log(failed === 0 ? '\n모든 테스트 통과' : `\n실패 ${failed}건`);
if (failed > 0) process.exit(1);
