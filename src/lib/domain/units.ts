/**
 * 단위 정의.
 *
 * 같은 family 안에서만 환산이 가능하다. (kg -> g, L -> ml)
 * 개/봉/팩/박스는 서로 환산 규칙이 없으므로 각각 독립된 family 로 둔다.
 * 새로운 단위를 추가하려면 UNITS 에 항목만 추가하면 된다.
 */

export const UNITS = ['g', 'kg', 'ml', 'L', '개', '봉', '팩', '박스'] as const;

export type Unit = (typeof UNITS)[number];

export interface UnitDef {
  /** 환산 가능한 단위 묶음 */
  family: string;
  /** 이 family 의 기준 단위 */
  base: Unit;
  /** 기준 단위로 환산할 때 곱하는 값 */
  factor: number;
}

export const UNIT_DEFS: Record<Unit, UnitDef> = {
  g: { family: 'mass', base: 'g', factor: 1 },
  kg: { family: 'mass', base: 'g', factor: 1000 },
  ml: { family: 'volume', base: 'ml', factor: 1 },
  L: { family: 'volume', base: 'ml', factor: 1000 },
  개: { family: 'count:개', base: '개', factor: 1 },
  봉: { family: 'count:봉', base: '봉', factor: 1 },
  팩: { family: 'count:팩', base: '팩', factor: 1 },
  박스: { family: 'count:박스', base: '박스', factor: 1 },
};

export const UNIT_GROUPS: { label: string; units: Unit[] }[] = [
  { label: '무게', units: ['g', 'kg'] },
  { label: '부피', units: ['ml', 'L'] },
  { label: '수량', units: ['개', '봉', '팩', '박스'] },
];

export function isUnit(value: unknown): value is Unit {
  return typeof value === 'string' && (UNITS as readonly string[]).includes(value);
}

export function baseUnitOf(unit: Unit): Unit {
  return UNIT_DEFS[unit].base;
}

export function familyOf(unit: Unit): string {
  return UNIT_DEFS[unit].family;
}

/** 같은 family 에 속한 단위들 (사용량 입력 시 선택 가능한 단위) */
export function unitsInFamilyOf(unit: Unit): Unit[] {
  const family = familyOf(unit);
  return UNITS.filter((u) => UNIT_DEFS[u].family === family);
}

export function isConvertible(from: Unit, to: Unit): boolean {
  return familyOf(from) === familyOf(to);
}

/** 입력 단위의 수량을 기준 단위 수량으로 환산 */
export function toBaseAmount(amount: number, unit: Unit): number {
  return amount * UNIT_DEFS[unit].factor;
}

/** 기준 단위 수량을 특정 단위 수량으로 환산 */
export function fromBaseAmount(baseAmount: number, unit: Unit): number {
  return baseAmount / UNIT_DEFS[unit].factor;
}
