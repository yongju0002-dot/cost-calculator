/**
 * 시세 품목과 사장님이 등록한 재료를 이름으로 맞춰본다.
 *
 * 코드가 아니라 이름으로 맞추는 것이라 완벽할 수 없다. 그래서 "품목 이름의 낱말이 재료
 * 이름에 모두 들어있으면 같은 것으로 본다" 는 느슨한 규칙만 쓴다.
 *   예) 품목 "돼지 앞다리" → 재료 "돼지고기 앞다리살"  ('돼지'·'앞다리' 둘 다 포함 → 맞음)
 *       품목 "양파"       → 재료 "양파", "자색양파"    (포함 → 맞음)
 *
 * 한 글자 낱말(예: 품목 "파")은 '양파'·'파프리카'까지 걸려버리므로 정확히 같을 때만 인정한다.
 */

function normalize(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

/** 품목 이름에서 비교에 쓸 낱말들 (괄호 안 설명은 버린다) */
function words(itemName: string): string[] {
  return itemName
    .replace(/\([^)]*\)/g, ' ')
    .split(/[\s·,]+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

export function isSameProduct(itemName: string, ingredientName: string): boolean {
  const ing = normalize(ingredientName);
  if (!ing) return false;

  const parts = words(itemName);
  const usable = parts.filter((w) => w.length >= 2);

  if (usable.length === 0) {
    // "파" 처럼 한 글자뿐인 품목은 이름이 정확히 같을 때만 인정한다.
    return parts.some((w) => ing === normalize(w));
  }
  return usable.every((w) => ing.includes(normalize(w)));
}

/** 재료 목록에서 이 품목과 같은 것으로 볼 재료 이름들 */
export function matchingIngredients(itemName: string, ingredientNames: string[]): string[] {
  return ingredientNames.filter((name) => isSameProduct(itemName, name));
}
