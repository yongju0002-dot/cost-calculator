export const DEFAULT_CATEGORIES = [
  '한식',
  '중식',
  '양식',
  '분식',
  '카페',
  '베이커리',
  '기타',
] as const;

export const DEFAULT_CATEGORY = '기타';

export function mergeCategories(custom: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of [...DEFAULT_CATEGORIES, ...custom]) {
    const trimmed = name.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  // '기타' 는 항상 마지막에 오도록 정렬한다.
  return [...result.filter((c) => c !== DEFAULT_CATEGORY), DEFAULT_CATEGORY];
}
