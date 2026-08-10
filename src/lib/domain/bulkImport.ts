import { parseNumberInput } from './money';
import { UNITS, isUnit, type Unit } from './units';

/**
 * 대량 등록용 파싱 로직 (UI 와 분리된 순수 함수).
 *
 * 사장님들이 실제로 하는 행동은 두 가지다.
 *  1. 엑셀에서 셀을 복사해 그대로 붙여넣기 (탭으로 구분된 텍스트가 들어온다)
 *  2. CSV / XLSX 파일 업로드
 * 두 경우 모두 "표 형태"로 바꾼 뒤 같은 검증을 거치도록 만든다.
 */

export type BulkField = 'name' | 'quantity' | 'unit' | 'price' | 'supplier' | 'memo';

export interface BulkColumn {
  /** 파일/붙여넣기의 원본 헤더 이름 */
  header: string;
  /** 이 열을 어떤 항목으로 볼지 (없으면 사용하지 않음) */
  field: BulkField | null;
}

export interface BulkRowInput {
  name: string;
  quantity: number;
  unit: Unit;
  price: number;
  supplier?: string;
  memo?: string;
}

export type BulkRowStatus = 'ok' | 'error' | 'duplicate';

export interface BulkRow {
  /** 원본 행 번호 (1부터) */
  line: number;
  raw: string[];
  status: BulkRowStatus;
  /** status 가 ok 일 때만 값이 있다 */
  value: BulkRowInput | null;
  /** 어떤 값이 왜 잘못됐고 어떻게 고쳐야 하는지 */
  issues: string[];
}

export interface BulkParseResult {
  headers: string[];
  columns: BulkColumn[];
  rows: BulkRow[];
  okCount: number;
  errorCount: number;
  duplicateCount: number;
}

/** 헤더 이름으로 어떤 항목인지 추측한다. */
const FIELD_HINTS: { field: BulkField; keywords: string[] }[] = [
  { field: 'name', keywords: ['이름', '재료', '품명', '상품', '명칭', 'name', 'item', '부자재'] },
  { field: 'quantity', keywords: ['수량', '용량', '중량', '양', 'qty', 'quantity', 'amount'] },
  { field: 'unit', keywords: ['단위', 'unit'] },
  { field: 'price', keywords: ['가격', '금액', '단가', '비용', 'price', 'cost'] },
  { field: 'supplier', keywords: ['거래처', '공급', '업체', 'supplier', 'vendor'] },
  { field: 'memo', keywords: ['메모', '비고', 'memo', 'note'] },
];

export function guessField(header: string): BulkField | null {
  const value = header.trim().toLowerCase().replace(/\s/g, '');
  if (!value) return null;
  for (const { field, keywords } of FIELD_HINTS) {
    if (keywords.some((keyword) => value.includes(keyword))) return field;
  }
  return null;
}

/** 한 줄을 구분자로 자른다. 따옴표로 감싼 값 안의 구분자는 무시한다. */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

/** 탭이 있으면 엑셀 복사본, 없으면 쉼표로 본다. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  return firstLine.includes('\t') ? '\t' : ',';
}

/** 붙여넣기 텍스트 / CSV 를 표로 바꾼다. */
export function parseTable(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => splitLine(line, delimiter));
}

/** 첫 줄이 헤더인지 판단한다. (숫자가 거의 없으면 헤더로 본다) */
export function looksLikeHeader(cells: string[]): boolean {
  if (cells.length === 0) return false;
  const numeric = cells.filter((cell) => parseNumberInput(cell) !== null).length;
  return numeric <= Math.floor(cells.length / 3);
}

/** 표를 헤더 + 데이터로 나누고, 각 열이 어떤 항목인지 추측한다. */
export function buildColumns(table: string[][]): { headers: string[]; columns: BulkColumn[]; body: string[][] } {
  if (table.length === 0) return { headers: [], columns: [], body: [] };

  const hasHeader = looksLikeHeader(table[0]);
  const width = Math.max(...table.map((row) => row.length));
  const headers = hasHeader
    ? Array.from({ length: width }, (_, i) => table[0][i]?.trim() || `열 ${i + 1}`)
    : Array.from({ length: width }, (_, i) => `열 ${i + 1}`);

  const columns: BulkColumn[] = headers.map((header, index) => ({
    header,
    // 헤더가 없으면 흔한 순서(이름·수량·단위·가격)로 기본값을 잡아준다.
    field: hasHeader ? guessField(header) : (['name', 'quantity', 'unit', 'price'][index] as BulkField) ?? null,
  }));

  return { headers, columns, body: hasHeader ? table.slice(1) : table };
}

function cellAt(row: string[], columns: BulkColumn[], field: BulkField): string {
  const index = columns.findIndex((column) => column.field === field);
  if (index < 0) return '';
  return (row[index] ?? '').trim();
}

/** 단위 표기를 정리한다. (예: "KG" -> "kg", "그램" -> "g") */
export function normalizeUnit(raw: string): Unit | null {
  const value = raw.trim();
  if (!value) return null;
  if (isUnit(value)) return value;
  const lower = value.toLowerCase();
  const aliases: Record<string, Unit> = {
    kg: 'kg',
    킬로: 'kg',
    킬로그램: 'kg',
    g: 'g',
    그램: 'g',
    ml: 'ml',
    밀리: 'ml',
    밀리리터: 'ml',
    l: 'L',
    리터: 'L',
    ea: '개',
    개입: '개',
    ...Object.fromEntries(UNITS.map((unit) => [unit.toLowerCase(), unit])),
  };
  return aliases[lower] ?? null;
}

/**
 * 표를 검증해 정상/오류/중복으로 나눈다.
 * existingNames 에는 이미 저장된 이름을 넘겨 중복을 알려준다.
 */
export function validateRows(
  body: string[][],
  columns: BulkColumn[],
  existingNames: string[] = [],
): BulkParseResult {
  const existing = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  const seen = new Set<string>();
  const hasNameColumn = columns.some((column) => column.field === 'name');

  const rows: BulkRow[] = body.map((raw, index) => {
    const issues: string[] = [];
    const name = cellAt(raw, columns, 'name');
    const quantityText = cellAt(raw, columns, 'quantity');
    const unitText = cellAt(raw, columns, 'unit');
    const priceText = cellAt(raw, columns, 'price');

    if (!hasNameColumn) issues.push('이름 열을 지정해주세요.');
    else if (!name) issues.push('이름이 비어 있습니다.');

    const quantity = parseNumberInput(quantityText);
    if (quantityText === '') issues.push('구매수량이 비어 있습니다.');
    else if (quantity === null) issues.push(`구매수량 "${quantityText}" 은(는) 숫자가 아닙니다.`);
    else if (quantity <= 0) issues.push('구매수량은 0보다 커야 합니다.');

    const price = parseNumberInput(priceText);
    if (priceText === '') issues.push('구매가격이 비어 있습니다.');
    else if (price === null) issues.push(`구매가격 "${priceText}" 은(는) 숫자가 아닙니다.`);
    else if (price <= 0) issues.push('구매가격은 0원보다 커야 합니다.');

    const unit = normalizeUnit(unitText);
    if (unitText === '') issues.push('단위가 비어 있습니다. (g, kg, ml, L, 개, 봉, 팩, 박스)');
    else if (!unit) issues.push(`단위 "${unitText}" 은(는) 사용할 수 없습니다. (g, kg, ml, L, 개, 봉, 팩, 박스)`);

    const key = name.trim().toLowerCase();
    const isDuplicate = Boolean(key) && (existing.has(key) || seen.has(key));
    if (key) seen.add(key);

    if (issues.length > 0) {
      return { line: index + 1, raw, status: 'error', value: null, issues };
    }
    if (isDuplicate) {
      return {
        line: index + 1,
        raw,
        status: 'duplicate',
        value: { name, quantity: quantity!, unit: unit!, price: price! },
        issues: ['이미 등록된 이름입니다. 선택하면 하나 더 추가됩니다.'],
      };
    }

    const supplier = cellAt(raw, columns, 'supplier');
    const memo = cellAt(raw, columns, 'memo');
    return {
      line: index + 1,
      raw,
      status: 'ok',
      value: {
        name,
        quantity: quantity!,
        unit: unit!,
        price: price!,
        supplier: supplier || undefined,
        memo: memo || undefined,
      },
      issues: [],
    };
  });

  return {
    headers: columns.map((column) => column.header),
    columns,
    rows,
    okCount: rows.filter((row) => row.status === 'ok').length,
    errorCount: rows.filter((row) => row.status === 'error').length,
    duplicateCount: rows.filter((row) => row.status === 'duplicate').length,
  };
}

/** 붙여넣기 텍스트를 바로 검증 결과까지 만든다. */
export function parseBulkText(text: string, existingNames: string[] = []): BulkParseResult {
  const { columns, body } = buildColumns(parseTable(text));
  return validateRows(body, columns, existingNames);
}

export const BULK_FIELD_LABELS: Record<BulkField, string> = {
  name: '이름',
  quantity: '구매수량',
  unit: '단위',
  price: '구매가격',
  supplier: '공급업체',
  memo: '메모',
};
