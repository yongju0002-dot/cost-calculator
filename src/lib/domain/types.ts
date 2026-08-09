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

export interface Ingredient {
  id: string;
  ownerId: string;
  name: string;
  /** 구매가격 (원) */
  price: number;
  /** 구매수량 */
  quantity: number;
  unit: Unit;
  memo?: string;
  /** 향후 확장: 거래처, 재고 등 */
  supplier?: string;
  priceHistory: PricePoint[];
  createdAt: string;
  updatedAt: string;
}

export type RecipeItemKind = 'ingredient' | 'manual';

export interface RecipeItem {
  id: string;
  kind: RecipeItemKind;
  /** 저장된 재료와 연결된 경우에만 값이 있다. 값이 있으면 가격 변동이 자동 반영된다. */
  ingredientId: string | null;
  name: string;
  /** kind === 'ingredient' 일 때 사용 */
  price: number;
  quantity: number;
  unit: Unit;
  amount: number;
  amountUnit: Unit;
  /** kind === 'manual' 일 때 사용 (기타 비용) */
  manualCost: number;
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
