/**
 * 대량 등록 파싱 검증.
 *   npx tsx tests/bulkImport.test.ts
 */
import {
  parseTable,
  looksLikeHeader,
  buildColumns,
  guessField,
  normalizeUnit,
  parseBulkText,
} from '../src/lib/domain/bulkImport.ts';

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

// 엑셀에서 복사하면 탭으로 구분된 텍스트가 들어온다 (기획서 예시 그대로)
const pasted = `재료명\t구매수량\t단위\t구매가격
양파\t10\tkg\t25000
대파\t5\tkg\t12000
고추장\t6.5\tkg\t30000`;

eq('탭 구분 표로 인식', parseTable(pasted).length, 4);
eq('헤더 줄 인식', looksLikeHeader(parseTable(pasted)[0]), true);
eq('데이터 줄은 헤더 아님', looksLikeHeader(['양파', '10', 'kg', '25000']), false);

const built = buildColumns(parseTable(pasted));
eq('헤더 추출', built.headers, ['재료명', '구매수량', '단위', '구매가격']);
eq(
  '열 자동 매칭',
  built.columns.map((c) => c.field),
  ['name', 'quantity', 'unit', 'price'],
);
eq('본문만 3줄', built.body.length, 3);

const result = parseBulkText(pasted);
eq('정상 3건', result.okCount, 3);
eq('오류 0건', result.errorCount, 0);
eq('첫 행 값', result.rows[0].value, {
  name: '양파',
  quantity: 10,
  unit: 'kg',
  price: 25000,
  supplier: undefined,
  memo: undefined,
});
eq('소수 수량 처리', result.rows[2].value?.quantity, 6.5);

// 헤더 이름 추측
eq('상품명 -> 이름', guessField('상품명'), 'name');
eq('수량 -> 구매수량', guessField('수량'), 'quantity');
eq('가격 -> 구매가격', guessField('가격'), 'price');
eq('Price -> 구매가격', guessField('Price'), 'price');
eq('알 수 없는 헤더', guessField('기타컬럼'), null);

// 단위 표기 보정
eq('KG 대문자', normalizeUnit('KG'), 'kg');
eq('그램', normalizeUnit('그램'), 'g');
eq('리터', normalizeUnit('리터'), 'L');
eq('EA -> 개', normalizeUnit('ea'), '개');
eq('잘못된 단위', normalizeUnit('통'), null);

// 오류 행 구분
const withErrors = `재료명\t구매수량\t단위\t구매가격
양파\t10\tkg\t25000
\t5\tkg\t12000
마늘\t스물\tkg\t9000
소금\t3\t통\t4000
설탕\t2\tkg\t`;
const errored = parseBulkText(withErrors);
eq('정상 1건', errored.okCount, 1);
eq('오류 4건', errored.errorCount, 4);
eq('이름 누락 안내', errored.rows[1].issues[0], '이름이 비어 있습니다.');
eq('숫자 아님 안내', errored.rows[2].issues[0], '구매수량 "스물" 은(는) 숫자가 아닙니다.');
eq(
  '단위 안내',
  errored.rows[3].issues[0],
  '단위 "통" 은(는) 사용할 수 없습니다. (g, kg, ml, L, 개, 봉, 팩, 박스)',
);
eq('가격 누락 안내', errored.rows[4].issues[0], '구매가격이 비어 있습니다.');

// 중복 판정 (기존 저장분 + 붙여넣기 내부 중복)
const dup = parseBulkText(
  `재료명\t구매수량\t단위\t구매가격
양파\t10\tkg\t25000
양파\t5\tkg\t13000
대파\t5\tkg\t12000`,
  ['대파'],
);
eq('중복 2건', dup.duplicateCount, 2);
eq('정상 1건(중복 제외)', dup.okCount, 1);

// 헤더가 없는 경우 흔한 순서로 가정
const noHeader = parseBulkText(`양파\t10\tkg\t25000
대파\t5\tkg\t12000`);
eq('헤더 없어도 인식', noHeader.okCount, 2);

// 쉼표 CSV + 따옴표 안의 쉼표
const csv = `이름,수량,단위,가격
"양파, 국내산",10,kg,"25,000"`;
const csvResult = parseBulkText(csv);
eq('CSV 정상 1건', csvResult.okCount, 1);
eq('따옴표 안 쉼표 유지', csvResult.rows[0].value?.name, '양파, 국내산');
eq('금액 콤마 파싱', csvResult.rows[0].value?.price, 25000);

console.log(failed === 0 ? '\n모든 테스트 통과' : `\n실패 ${failed}건`);
if (failed > 0) process.exit(1);
