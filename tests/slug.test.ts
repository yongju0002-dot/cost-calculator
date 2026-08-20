/**
 * 품목 슬러그가 유일한지, 되찾아지는지 확인한다.
 *   npx tsx tests/slug.test.ts
 */
import { CATALOG } from '../src/lib/market/catalog.ts';
import { findItemBySlug, itemSlug } from '../src/lib/market/slug.ts';

let failed = 0;
function eq(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${JSON.stringify(actual)}`);
}

const slugs = CATALOG.map(itemSlug);
const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
eq('전체 개수', slugs.length, CATALOG.length);
eq('중복 없음', dup.length, 0);
eq('URL에 위험 문자 없음(공백/괄호)', slugs.some((s) => /[\s()]/.test(s)), false);

const onion = CATALOG.find((c) => c.key === '200_245');
eq('양파 슬러그 왕복', onion ? findItemBySlug(itemSlug(onion))?.key : null, '200_245');
eq('없는 슬러그는 undefined', findItemBySlug('아무말-000_000'), undefined);

console.log(failed === 0 ? '\n모든 테스트 통과' : `\n실패 ${failed}건`);
if (failed > 0) process.exit(1);
