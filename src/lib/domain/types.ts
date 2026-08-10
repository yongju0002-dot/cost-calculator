import type { Unit } from './units';

/**
 * 도메인 타입.
 *
 * 향후 확장(재고/매출/여러 매장/직원 계정 등)을 고려해
 * 모든 레코드는 ownerId 를 갖고, 확장 필드는 optional 로 둔다.
 * 저장소를 localStorage 에서 서버 DB 로 바꿔도 타입은 그대로 쓸 수 있다.
 */

export interface PricePoint {
  /** 구매가격 */
  price: number;
  /** 구매수량 */
  quantity: number;
  unit: Unit;
  /** 기준 단위(g/ml/개…) 당 원가 */
  unitCost: number;
  /** 기록 시각 (ISO) */
  at: string;
}

/**
 * 원가 계산에 사용할 가격 기준.
 *  - manual: 사용자가 직접 입력한 가격 (기본값, 기존 동작)
 *  - latest: 매입 이력 중 가장 최근 가격
 *  - average: 매입 이력의 평균 단가
 */
export type PricingMode = 'manual' | 'latest' | 'average';

export interface Ingredient {
  id: string;
  ownerId: string;
  name: string;
  /** 현재 적용 중인 구매가격 (원). 가격 기준에 따라 매입 이력에서 자동으로 채워질 수 있다. */
  price: number;
  /** 구매수량 */
  quantity: number;
  unit: Unit;
  memo?: string;
  /** 향후 확장: 거래처, 재고 등 */
  supplier?: string;
  priceHistory: PricePoint[];
  /** 없으면 'manual' 로 취급한다. (기존 데이터 호환) */
  pricingMode?: PricingMode;
  createdAt: string;
  updatedAt: string;
}

/**
 * 부자재 (포장용기, 젓가락, 냅킨 등).
 * 식재료와 계산 방식이 같아 구조를 맞춰두었다.
 */
export interface Supply {
  id: string;
  ownerId: string;
  name: string;
  /** 현재 적용 중인 구매가격 (원) */
  price: number;
  /** 구매수량 */
  quantity: number;
  unit: Unit;
  supplier?: string;
  memo?: string;
  priceHistory: PricePoint[];
  pricingMode?: PricingMode;
  createdAt: string;
  updatedAt: string;
}

/**
 * 프렙 (미리 만들어두는 양념장·육수 등).
 * 여러 재료를 섞어 일정량을 만들어두고, 메뉴에서는 그중 일부만 사용한다.
 *
 * items 에는 kind 가 'ingredient' 또는 'manual' 인 항목만 들어간다.
 * (프렙 안에 프렙을 넣는 것은 순환 참조 위험이 있어 허용하지 않는다.)
 */
export interface Prep {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  items: RecipeItem[];
  /** 완성 후 총 생산량 */
  yieldAmount: number;
  yieldUnit: Unit;
  memo?: string;
  /** 사진 (data URL 또는 외부 주소) */
  photoUrl?: string;
  /** 원가가 바뀔 때마다 기록된다. */
  costHistory: CostPoint[];
  createdAt: string;
  updatedAt: string;
}

export type RecipeItemKind = 'ingredient' | 'prep' | 'supply' | 'manual';

export interface RecipeItem {
  id: string;
  kind: RecipeItemKind;
  /** 저장된 재료와 연결된 경우에만 값이 있다. 값이 있으면 가격 변동이 자동 반영된다. */
  ingredientId: string | null;
  /** kind === 'prep' 일 때 연결된 프렙 */
  prepId?: string | null;
  /** kind === 'supply' 일 때 연결된 부자재 */
  supplyId?: string | null;
  name: string;
  /**
   * 단위 원가를 구하기 위한 기준 값.
   *  - 재료: 구매가격 / 구매수량
   *  - 프렙: 프렙 총원가 / 총생산량
   *  - 부자재: 구매가격 / 구매수량
   * 세 경우 모두 price ÷ quantity 로 단위 원가가 나오므로 계산식이 동일하다.
   */
  price: number;
  quantity: number;
  unit: Unit;
  amount: number;
  amountUnit: Unit;
  /** kind === 'manual' 일 때 사용 (기타 비용) */
  manualCost: number;
}

/** 식재료·부자재의 날짜별 매입 기록 */
export interface PurchaseRecord {
  id: string;
  ownerId: string;
  targetType: 'ingredient' | 'supply';
  targetId: string;
  /** 구매일 (YYYY-MM-DD) */
  purchasedAt: string;
  supplier?: string;
  /** 구매 수량 */
  quantity: number;
  unit: Unit;
  /** 구매 금액 (원) */
  amount: number;
  /** 기준 단위당 가격 (저장 시점에 계산해 보관) */
  unitCost: number;
  memo?: string;
  createdAt: string;
}

export interface CostPoint {
  cost: number;
  at: string;
}

export interface Menu {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  items: RecipeItem[];
  /** 판매가격 (원) */
  sellingPrice: number;
  memo?: string;
  /** 원가가 바뀔 때마다 기록된다. 마지막 항목이 현재 원가. */
  costHistory: CostPoint[];
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  version: number;
  ingredients: Ingredient[];
  menus: Menu[];
  /** 사용자가 직접 추가한 카테고리 */
  customCategories: string[];
  /** 아래 항목들은 나중에 추가되었다. 기존 데이터에는 없을 수 있어 항상 기본값으로 보정한다. */
  preps?: Prep[];
  supplies?: Supply[];
  purchases?: PurchaseRecord[];
}

export interface Account {
  id: string;
  email: string;
  name: string;
  /** provider 별 인증 정보. email 로그인일 때만 비밀번호 해시를 갖는다. */
  provider: 'email' | 'google';
  passwordHash?: string;
  salt?: string;
  createdAt: string;
}

export type SessionUser = Pick<Account, 'id' | 'email' | 'name' | 'provider'>;
