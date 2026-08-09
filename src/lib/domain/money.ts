/**
 * 금액/숫자 처리.
 *
 * 자바스크립트 부동소수점 오차(0.1 + 0.2 = 0.30000000000000004) 때문에
 * 모든 반올림은 roundTo() 를 거치도록 한다.
 */

/** 소수점 decimals 자리에서 반올림 (부동소수점 오차 보정 포함) */
export function roundTo(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  // (1 + EPSILON) 을 곱해 2.675 * 100 = 267.49999... 같은 이진수 오차를 보정한다.
  const scaled = Math.round(value * factor * (1 + Number.EPSILON));
  // -0 이 나오지 않도록 0 을 더한다.
  return scaled / factor + 0;
}

/** 원 단위 반올림 */
export function roundWon(value: number): number {
  return roundTo(value, 0);
}

/** step 단위로 올림 (추천 판매가격 계산용) */
export function ceilTo(value: number, step: number): number {
  if (!Number.isFinite(value) || step <= 0) return 0;
  return roundTo(Math.ceil(roundTo(value / step, 6)) * step, 0);
}

const numberFormatCache = new Map<string, Intl.NumberFormat>();

function formatter(decimals: number, fixed = false): Intl.NumberFormat {
  const key = `${decimals}:${fixed}`;
  let f = numberFormatCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('ko-KR', {
      minimumFractionDigits: fixed ? decimals : 0,
      maximumFractionDigits: decimals,
    });
    numberFormatCache.set(key, f);
  }
  return f;
}

/** 소수점 자리수를 고정해서 표기한다. 27 -> "27.0" */
export function formatFixed(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return formatter(decimals, true).format(0);
  return formatter(decimals, true).format(roundTo(value, decimals));
}

/** 천 단위 콤마. 10000 -> "10,000" */
export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '0';
  return formatter(decimals).format(roundTo(value, decimals));
}

/** 10000 -> "10,000원" */
export function formatWon(value: number, decimals = 0): string {
  return `${formatNumber(value, decimals)}원`;
}

/** 부호를 붙인 금액. 320 -> "+320원", -120 -> "-120원" */
export function formatWonDelta(value: number): string {
  const rounded = roundWon(value);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${formatNumber(rounded)}원`;
}

/**
 * 단위 원가 표기.
 * 금액이 클수록 소수점을 줄여서 읽기 쉽게 만든다.
 * 9 -> "9", 1.5 -> "1.5", 266.666 -> "267"
 */
export function formatUnitCost(value: number): string {
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return formatNumber(value, decimals);
}

/** 24.333 -> "24.3%", 27 -> "27.0%" */
export function formatPercent(value: number, decimals = 1): string {
  return `${formatFixed(value, decimals)}%`;
}

export function formatPercentDelta(value: number, decimals = 1): string {
  const rounded = roundTo(value, decimals);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${formatFixed(rounded, decimals)}%`;
}

/**
 * 사용자가 입력한 문자열을 숫자로 변환한다.
 * "12,000" -> 12000, "" -> null, "abc" -> null
 */
export function parseNumberInput(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[,\s원%]/g, '');
  if (cleaned === '' || cleaned === '.' || cleaned === '-') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return value;
}

/** 입력 중인 문자열에 천 단위 콤마를 적용한다. (소수점 입력 중 상태도 유지) */
export function applyThousandSeparator(raw: string): string {
  if (!raw) return '';
  const negative = raw.trim().startsWith('-');
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (cleaned === '') return negative ? '-' : '';
  const [intPart, ...rest] = cleaned.split('.');
  const decimalPart = rest.join('');
  const withComma = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const hasDot = cleaned.includes('.');
  return `${negative ? '-' : ''}${withComma}${hasDot ? '.' : ''}${decimalPart}`;
}
