import { CATALOG, type CatalogItem } from './catalog';

/**
 * 품목 하나당 URL 하나(`/prices/양파-200_245` 처럼)를 만들기 위한 매핑.
 *
 * 이름을 앞에 두는 이유: 검색 결과에 보이는 주소도 사용자가 읽고 신뢰할 근거가 된다.
 * 뒤의 코드(품목의 카탈로그 key)는 이름이 같은 경우가 없어 사실 필요 없지만,
 * 나중에 카탈로그 이름이 바뀌어도 URL 이 깨지지 않게 안전장치로 붙여둔다.
 */
function slugifyName(name: string): string {
  return name.replace(/[()]/g, '').replace(/\s+/g, '-');
}

export function itemSlug(item: CatalogItem): string {
  return `${slugifyName(item.name)}-${item.key}`;
}

const BY_SLUG = new Map<string, CatalogItem>(CATALOG.map((item) => [itemSlug(item), item]));

/**
 * slug 로 품목을 찾는다. generateStaticParams 가 만든 것과 정확히 같은 문자열만 통과시킨다
 * (dynamicParams=false 와 짝을 이뤄, 오래된 링크·오타 슬러그가 별도 URL 로 색인되는 걸 막는다).
 */
export function findItemBySlug(slug: string): CatalogItem | undefined {
  return BY_SLUG.get(slug);
}
