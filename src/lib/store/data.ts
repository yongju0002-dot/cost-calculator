'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/lib/auth/auth';
import { mergeCategories } from '@/lib/domain/categories';
import {
  applyPricingMode,
  computeMenuCost,
  computePrepCost,
  purchaseUnitCost,
  type CostSources,
} from '@/lib/domain/cost';
import { limitStatus, type LimitStatus } from '@/lib/domain/limits';
import { buildMenuView, type MenuView } from '@/lib/domain/menuView';
import { createSampleData } from '@/lib/domain/sample';
import type {
  AppData,
  Ingredient,
  Menu,
  Prep,
  PricingMode,
  PurchaseRecord,
  RecipeItem,
  Supply,
} from '@/lib/domain/types';
import { isUnit, type Unit } from '@/lib/domain/units';
import { createId, isBrowser, nowIso, readJson, storageKeys, writeJson } from '@/lib/storage/local';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { ExternalStore } from './externalStore';
import { fetchRemoteData, isEmptyData, pushRemoteData } from './remote';

/**
 * 재료·메뉴 데이터 저장소.
 *
 * 지금은 브라우저 localStorage 에 계정별로 저장한다.
 * 서버 DB 로 옮길 때는 readData/persist 두 함수만 교체하면 되도록 분리해 두었다.
 */

export const GUEST_OWNER = 'guest';

const EMPTY_DATA: AppData = {
  version: 2,
  ingredients: [],
  menus: [],
  customCategories: [],
  preps: [],
  supplies: [],
  purchases: [],
};

export interface IngredientInput {
  name: string;
  price: number;
  quantity: number;
  unit: Unit;
  memo?: string;
  supplier?: string;
  pricingMode?: PricingMode;
}

export interface SupplyInput {
  name: string;
  price: number;
  quantity: number;
  unit: Unit;
  supplier?: string;
  memo?: string;
  pricingMode?: PricingMode;
}

export interface PrepInput {
  name: string;
  description?: string;
  items: RecipeItem[];
  yieldAmount: number;
  yieldUnit: Unit;
  memo?: string;
  photoUrl?: string;
}

export interface PurchaseInput {
  targetType: 'ingredient' | 'supply';
  targetId: string;
  purchasedAt: string;
  supplier?: string;
  quantity: number;
  unit: Unit;
  amount: number;
  memo?: string;
}

export interface MenuInput {
  name: string;
  category: string;
  items: RecipeItem[];
  sellingPrice: number;
  memo?: string;
}

export interface AffectedMenu {
  id: string;
  name: string;
  previousCost: number;
  currentCost: number;
}

/** 서버 저장 상태 */
export type SyncStatus = 'off' | 'loading' | 'saving' | 'synced' | 'error';

interface DataState {
  ownerId: string;
  data: AppData;
  /** 브라우저 저장소에서 데이터를 읽어왔는지 여부 */
  ready: boolean;
  sync: SyncStatus;
  syncError: string | null;
}

const SERVER_STATE: DataState = {
  ownerId: GUEST_OWNER,
  data: EMPTY_DATA,
  ready: false,
  sync: 'off',
  syncError: null,
};

function normalizeData(raw: unknown): AppData {
  const data = (raw ?? {}) as Partial<AppData>;
  return {
    version: typeof data.version === 'number' ? data.version : 1,
    ingredients: Array.isArray(data.ingredients)
      ? data.ingredients.filter((i) => i && typeof i.id === 'string' && isUnit(i.unit))
      : [],
    menus: Array.isArray(data.menus)
      ? data.menus
          .filter((m) => m && typeof m.id === 'string')
          .map((m) => ({
            ...m,
            items: Array.isArray(m.items) ? m.items : [],
            costHistory: Array.isArray(m.costHistory) ? m.costHistory : [],
          }))
      : [],
    customCategories: Array.isArray(data.customCategories) ? data.customCategories : [],
    // 아래 세 가지는 나중에 추가된 항목이라 기존 데이터에는 없다. 반드시 빈 배열로 채운다.
    preps: Array.isArray(data.preps)
      ? data.preps
          .filter((p) => p && typeof p.id === 'string')
          .map((p) => ({
            ...p,
            items: Array.isArray(p.items) ? p.items : [],
            costHistory: Array.isArray(p.costHistory) ? p.costHistory : [],
          }))
      : [],
    supplies: Array.isArray(data.supplies)
      ? data.supplies.filter((s) => s && typeof s.id === 'string' && isUnit(s.unit))
      : [],
    purchases: Array.isArray(data.purchases)
      ? data.purchases.filter((p) => p && typeof p.id === 'string' && isUnit(p.unit))
      : [],
  };
}

function readData(ownerId: string): AppData {
  return normalizeData(readJson(storageKeys.data(ownerId), EMPTY_DATA));
}

const store = new ExternalStore<DataState>(
  () => SERVER_STATE,
  () => ({
    ownerId: GUEST_OWNER,
    data: readData(GUEST_OWNER),
    ready: true,
    sync: 'off',
    syncError: null,
  }),
);

// 다른 탭에서 데이터를 바꿨다면 현재 탭에도 반영한다.
if (isBrowser()) {
  window.addEventListener('storage', (event) => {
    const current = store.getSnapshot();
    if (event.key === storageKeys.data(current.ownerId)) {
      store.replace({ ...current, data: readData(current.ownerId), ready: true });
    }
  });
}

function setSync(sync: SyncStatus, syncError: string | null = null): void {
  const current = store.getSnapshot();
  if (current.sync === sync && current.syncError === syncError) return;
  store.replace({ ...current, sync, syncError });
}

// ─────────────────────────────────────────────────────────
// 서버 저장 (로그인 + Supabase 설정이 되어 있을 때만 동작)
// ─────────────────────────────────────────────────────────

let pushTimer: ReturnType<typeof setTimeout> | null = null;
/** 아직 서버에 올리지 못한 내용이 있는지 */
let pendingOwner: string | null = null;

/**
 * 저장할 때마다 서버에 바로 보내면 요청이 너무 잦아지므로 잠깐 모았다가 보낸다.
 * 창을 닫을 때는 남은 내용을 즉시 보낸다.
 */
function schedulePush(ownerId: string): void {
  if (!isSupabaseConfigured || ownerId === GUEST_OWNER) return;
  pendingOwner = ownerId;
  if (pushTimer) clearTimeout(pushTimer);
  setSync('saving');
  pushTimer = setTimeout(() => void flushPush(), 900);
}

async function flushPush(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  const ownerId = pendingOwner;
  if (!ownerId) return;
  pendingOwner = null;

  const current = store.getSnapshot();
  // 그 사이 로그아웃했거나 계정이 바뀌었다면 보내지 않는다.
  if (current.ownerId !== ownerId) return;

  try {
    await pushRemoteData(ownerId, current.data);
    setSync('synced');
  } catch (error) {
    pendingOwner = ownerId;
    setSync('error', error instanceof Error ? error.message : '서버 저장에 실패했습니다.');
  }
}

if (isBrowser()) {
  // 창을 닫거나 탭을 벗어날 때 남은 내용을 저장한다.
  window.addEventListener('pagehide', () => void flushPush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushPush();
  });
}

/**
 * 로그인 직후 서버 내용을 가져온다.
 *  - 서버에 내용이 있으면 그것을 쓴다. (다른 기기에서 쓰던 내용)
 *  - 서버가 비어 있고 이 기기에만 내용이 있으면 그대로 서버로 올린다.
 */
async function syncWithServer(ownerId: string): Promise<void> {
  if (!isSupabaseConfigured || ownerId === GUEST_OWNER) {
    setSync('off');
    return;
  }
  setSync('loading');
  try {
    const remote = await fetchRemoteData(ownerId);
    const current = store.getSnapshot();
    if (current.ownerId !== ownerId) return;

    if (remote && !isEmptyData(normalizeData(remote.data))) {
      const merged = normalizeData(remote.data);
      writeJson(storageKeys.data(ownerId), merged);
      store.replace({ ...current, data: merged, ready: true, sync: 'synced', syncError: null });
      return;
    }

    // 서버가 비어 있는 첫 로그인 — 이 기기 내용을 올려둔다.
    if (!isEmptyData(current.data)) {
      await pushRemoteData(ownerId, current.data);
    }
    setSync('synced');
  } catch (error) {
    setSync('error', error instanceof Error ? error.message : '서버에서 데이터를 가져오지 못했습니다.');
  }
}

/** 로그인 상태가 바뀌면 해당 계정의 데이터로 교체한다. */
function setOwner(ownerId: string): void {
  const current = store.getSnapshot();
  if (current.ready && current.ownerId === ownerId) return;
  // 계정이 바뀌면 이전 계정으로 보내려던 저장은 취소한다.
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  pendingOwner = null;
  store.replace({
    ownerId,
    data: readData(ownerId),
    ready: true,
    sync: isSupabaseConfigured && ownerId !== GUEST_OWNER ? 'loading' : 'off',
    syncError: null,
  });
  void syncWithServer(ownerId);
}

function mutate(updater: (data: AppData) => AppData): void {
  const current = store.getSnapshot();
  const next = updater(current.data);
  if (next === current.data) return;
  writeJson(storageKeys.data(current.ownerId), next);
  store.replace({ ...current, data: next, ready: true });
  schedulePush(current.ownerId);
}

/** 저장에 실패했을 때 다시 시도한다. */
export function retrySync(): void {
  const { ownerId } = store.getSnapshot();
  if (ownerId === GUEST_OWNER) return;
  pendingOwner = ownerId;
  void flushPush();
}

function toIngredientMap(ingredients: Ingredient[]): Map<string, Ingredient> {
  return new Map(ingredients.map((i) => [i.id, i]));
}

function toSources(data: AppData): CostSources {
  return {
    ingredients: toIngredientMap(data.ingredients),
    preps: new Map((data.preps ?? []).map((p) => [p.id, p])),
    supplies: new Map((data.supplies ?? []).map((s) => [s.id, s])),
  };
}

/**
 * 가격이 바뀐 뒤 전체를 다시 계산한다.
 *
 * 원가는 아래 순서로 흘러가므로 반드시 이 순서를 지켜야 한다.
 *   식재료 → 프렙 → 메뉴
 *   부자재 → 메뉴
 *
 * 값이 실제로 달라진 경우에만 이력을 남긴다.
 */
function recalculate(data: AppData): { data: AppData; affected: AffectedMenu[] } {
  const at = nowIso();
  const ingredientMap = toIngredientMap(data.ingredients);

  // 1) 프렙 원가 갱신
  const preps = (data.preps ?? []).map((prep) => {
    const cost = computePrepCost(prep, ingredientMap);
    const last = prep.costHistory.at(-1);
    if (last && last.cost === cost) return prep;
    return {
      ...prep,
      costHistory: [...prep.costHistory, { cost, at }].slice(-30),
      updatedAt: at,
    };
  });

  // 2) 갱신된 프렙·부자재를 반영해 메뉴 원가 갱신
  const sources: CostSources = {
    ingredients: ingredientMap,
    preps: new Map(preps.map((p) => [p.id, p])),
    supplies: new Map((data.supplies ?? []).map((s) => [s.id, s])),
  };

  const affected: AffectedMenu[] = [];
  const menus = data.menus.map((menu) => {
    const currentCost = computeMenuCost(menu, sources);
    const last = menu.costHistory.at(-1);
    if (last && last.cost === currentCost) return menu;
    if (last) {
      affected.push({
        id: menu.id,
        name: menu.name,
        previousCost: last.cost,
        currentCost,
      });
    }
    return {
      ...menu,
      costHistory: [...menu.costHistory, { cost: currentCost, at }].slice(-30),
      updatedAt: at,
    };
  });

  return { data: { ...data, preps, menus }, affected };
}

/** 무료 한도에 걸리면 null 을 돌려준다. */
export function addIngredient(input: IngredientInput): Ingredient | null {
  if (limitStatus('ingredients', store.getSnapshot().data.ingredients.length).atLimit) return null;
  const at = nowIso();
  const ingredient: Ingredient = {
    id: createId('ing'),
    ownerId: store.getSnapshot().ownerId,
    name: input.name.trim(),
    price: input.price,
    quantity: input.quantity,
    unit: input.unit,
    memo: input.memo?.trim() || undefined,
    priceHistory: [
      {
        price: input.price,
        quantity: input.quantity,
        unit: input.unit,
        unitCost: input.quantity > 0 ? input.price / input.quantity : 0,
        at,
      },
    ],
    createdAt: at,
    updatedAt: at,
  };
  mutate((data) => ({ ...data, ingredients: [ingredient, ...data.ingredients] }));
  return ingredient;
}

export function updateIngredient(id: string, input: IngredientInput): AffectedMenu[] {
  let affected: AffectedMenu[] = [];
  mutate((data) => {
    const at = nowIso();
    const ingredients = data.ingredients.map((ingredient) => {
      if (ingredient.id !== id) return ingredient;
      const priceChanged =
        ingredient.price !== input.price ||
        ingredient.quantity !== input.quantity ||
        ingredient.unit !== input.unit;
      return {
        ...ingredient,
        name: input.name.trim(),
        price: input.price,
        quantity: input.quantity,
        unit: input.unit,
        memo: input.memo?.trim() || undefined,
        priceHistory: priceChanged
          ? [
              ...ingredient.priceHistory,
              {
                price: input.price,
                quantity: input.quantity,
                unit: input.unit,
                unitCost: input.quantity > 0 ? input.price / input.quantity : 0,
                at,
              },
            ].slice(-30)
          : ingredient.priceHistory,
        updatedAt: at,
      };
    });
    const result = recalculate({ ...data, ingredients });
    affected = result.affected;
    return result.data;
  });
  return affected;
}

export function removeIngredient(id: string): void {
  mutate((data) => {
    // 삭제된 재료를 쓰던 메뉴·프렙은 마지막 가격을 그대로 유지한 채 연결만 끊는다.
    const unlink = (items: RecipeItem[]) =>
      items.map((item) => (item.ingredientId === id ? { ...item, ingredientId: null } : item));
    return {
      ...data,
      ingredients: data.ingredients.filter((i) => i.id !== id),
      purchases: (data.purchases ?? []).filter(
        (p) => !(p.targetType === 'ingredient' && p.targetId === id),
      ),
      menus: data.menus.map((menu) =>
        menu.items.some((item) => item.ingredientId === id)
          ? { ...menu, items: unlink(menu.items) }
          : menu,
      ),
      preps: (data.preps ?? []).map((prep) =>
        prep.items.some((item) => item.ingredientId === id)
          ? { ...prep, items: unlink(prep.items) }
          : prep,
      ),
    };
  });
}

/** 무료 한도에 걸리면 null 을 돌려준다. */
export function addMenu(input: MenuInput): Menu | null {
  const at = nowIso();
  const { data, ownerId } = store.getSnapshot();
  if (limitStatus('menus', data.menus.length).atLimit) return null;
  const base: Menu = {
    id: createId('menu'),
    ownerId,
    name: input.name.trim(),
    category: input.category,
    items: input.items,
    sellingPrice: input.sellingPrice,
    memo: input.memo?.trim() || undefined,
    costHistory: [],
    createdAt: at,
    updatedAt: at,
  };
  const menu: Menu = {
    ...base,
    costHistory: [{ cost: computeMenuCost(base, toSources(data)), at }],
  };
  mutate((prev) => ({ ...prev, menus: [menu, ...prev.menus] }));
  return menu;
}

export function updateMenu(id: string, input: MenuInput): Menu | null {
  let updated: Menu | null = null;
  mutate((data) => {
    const at = nowIso();
    const map = toSources(data);
    const menus = data.menus.map((menu) => {
      if (menu.id !== id) return menu;
      const next: Menu = {
        ...menu,
        name: input.name.trim(),
        category: input.category,
        items: input.items,
        sellingPrice: input.sellingPrice,
        memo: input.memo?.trim() || undefined,
        updatedAt: at,
      };
      const cost = computeMenuCost(next, map);
      const last = next.costHistory.at(-1);
      const withHistory: Menu =
        last && last.cost === cost
          ? next
          : { ...next, costHistory: [...next.costHistory, { cost, at }].slice(-30) };
      updated = withHistory;
      return withHistory;
    });
    return { ...data, menus };
  });
  return updated;
}

/** 원본이 없거나 무료 한도에 걸리면 null 을 돌려준다. */
export function duplicateMenu(id: string): Menu | null {
  const { data } = store.getSnapshot();
  const source = data.menus.find((m) => m.id === id);
  if (!source) return null;
  if (limitStatus('menus', data.menus.length).atLimit) return null;
  const at = nowIso();
  const copy: Menu = {
    ...source,
    id: createId('menu'),
    name: `${source.name} (복사본)`,
    items: source.items.map((item) => ({ ...item, id: createId('item') })),
    costHistory: [{ cost: source.costHistory.at(-1)?.cost ?? 0, at }],
    createdAt: at,
    updatedAt: at,
  };
  mutate((data) => ({ ...data, menus: [copy, ...data.menus] }));
  return copy;
}

export function removeMenu(id: string): void {
  mutate((data) => ({ ...data, menus: data.menus.filter((m) => m.id !== id) }));
}

// ─────────────────────────────────────────────────────────
// 부자재
// ─────────────────────────────────────────────────────────

/** 무료 한도에 걸리면 null 을 돌려준다. */
export function addSupply(input: SupplyInput): Supply | null {
  if (limitStatus('supplies', (store.getSnapshot().data.supplies ?? []).length).atLimit) return null;
  const at = nowIso();
  const supply: Supply = {
    id: createId('sup'),
    ownerId: store.getSnapshot().ownerId,
    name: input.name.trim(),
    price: input.price,
    quantity: input.quantity,
    unit: input.unit,
    supplier: input.supplier?.trim() || undefined,
    memo: input.memo?.trim() || undefined,
    pricingMode: input.pricingMode ?? 'manual',
    priceHistory: [
      {
        price: input.price,
        quantity: input.quantity,
        unit: input.unit,
        unitCost: input.quantity > 0 ? input.price / input.quantity : 0,
        at,
      },
    ],
    createdAt: at,
    updatedAt: at,
  };
  mutate((data) => ({ ...data, supplies: [supply, ...(data.supplies ?? [])] }));
  return supply;
}

export function updateSupply(id: string, input: SupplyInput): AffectedMenu[] {
  let affected: AffectedMenu[] = [];
  mutate((data) => {
    const at = nowIso();
    const supplies = (data.supplies ?? []).map((supply) => {
      if (supply.id !== id) return supply;
      const priceChanged =
        supply.price !== input.price ||
        supply.quantity !== input.quantity ||
        supply.unit !== input.unit;
      return {
        ...supply,
        name: input.name.trim(),
        price: input.price,
        quantity: input.quantity,
        unit: input.unit,
        supplier: input.supplier?.trim() || undefined,
        memo: input.memo?.trim() || undefined,
        pricingMode: input.pricingMode ?? supply.pricingMode ?? 'manual',
        priceHistory: priceChanged
          ? [
              ...supply.priceHistory,
              {
                price: input.price,
                quantity: input.quantity,
                unit: input.unit,
                unitCost: input.quantity > 0 ? input.price / input.quantity : 0,
                at,
              },
            ].slice(-30)
          : supply.priceHistory,
        updatedAt: at,
      };
    });
    const result = recalculate({ ...data, supplies });
    affected = result.affected;
    return result.data;
  });
  return affected;
}

export function removeSupply(id: string): void {
  mutate((data) => ({
    ...data,
    supplies: (data.supplies ?? []).filter((s) => s.id !== id),
    purchases: (data.purchases ?? []).filter(
      (p) => !(p.targetType === 'supply' && p.targetId === id),
    ),
    // 사용 중이던 메뉴는 마지막 가격을 유지한 채 연결만 끊는다.
    menus: data.menus.map((menu) =>
      menu.items.some((item) => item.supplyId === id)
        ? {
            ...menu,
            items: menu.items.map((item) =>
              item.supplyId === id ? { ...item, supplyId: null } : item,
            ),
          }
        : menu,
    ),
  }));
}

// ─────────────────────────────────────────────────────────
// 프렙
// ─────────────────────────────────────────────────────────

/** 무료 한도에 걸리면 null 을 돌려준다. */
export function addPrep(input: PrepInput): Prep | null {
  const at = nowIso();
  const { data, ownerId } = store.getSnapshot();
  if (limitStatus('preps', (data.preps ?? []).length).atLimit) return null;
  const base: Prep = {
    id: createId('prep'),
    ownerId,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    items: input.items,
    yieldAmount: input.yieldAmount,
    yieldUnit: input.yieldUnit,
    memo: input.memo?.trim() || undefined,
    photoUrl: input.photoUrl || undefined,
    costHistory: [],
    createdAt: at,
    updatedAt: at,
  };
  const prep: Prep = {
    ...base,
    costHistory: [{ cost: computePrepCost(base, toIngredientMap(data.ingredients)), at }],
  };
  mutate((prev) => ({ ...prev, preps: [prep, ...(prev.preps ?? [])] }));
  return prep;
}

export function updatePrep(id: string, input: PrepInput): AffectedMenu[] {
  let affected: AffectedMenu[] = [];
  mutate((data) => {
    const at = nowIso();
    const preps = (data.preps ?? []).map((prep) =>
      prep.id === id
        ? {
            ...prep,
            name: input.name.trim(),
            description: input.description?.trim() || undefined,
            items: input.items,
            yieldAmount: input.yieldAmount,
            yieldUnit: input.yieldUnit,
            memo: input.memo?.trim() || undefined,
            photoUrl: input.photoUrl || undefined,
            updatedAt: at,
          }
        : prep,
    );
    const result = recalculate({ ...data, preps });
    affected = result.affected;
    return result.data;
  });
  return affected;
}

export function removePrep(id: string): void {
  mutate((data) => ({
    ...data,
    preps: (data.preps ?? []).filter((p) => p.id !== id),
    menus: data.menus.map((menu) =>
      menu.items.some((item) => item.prepId === id)
        ? {
            ...menu,
            items: menu.items.map((item) =>
              item.prepId === id ? { ...item, prepId: null } : item,
            ),
          }
        : menu,
    ),
  }));
}

/** 원본이 없거나 무료 한도에 걸리면 null 을 돌려준다. */
export function duplicatePrep(id: string): Prep | null {
  const preps = store.getSnapshot().data.preps ?? [];
  const source = preps.find((p) => p.id === id);
  if (!source) return null;
  if (limitStatus('preps', preps.length).atLimit) return null;
  const at = nowIso();
  const copy: Prep = {
    ...source,
    id: createId('prep'),
    name: `${source.name} (복사본)`,
    items: source.items.map((item) => ({ ...item, id: createId('item') })),
    costHistory: [{ cost: source.costHistory.at(-1)?.cost ?? 0, at }],
    createdAt: at,
    updatedAt: at,
  };
  mutate((data) => ({ ...data, preps: [copy, ...(data.preps ?? [])] }));
  return copy;
}

// ─────────────────────────────────────────────────────────
// 매입가 이력
// ─────────────────────────────────────────────────────────

export function addPurchase(input: PurchaseInput): AffectedMenu[] {
  let affected: AffectedMenu[] = [];
  mutate((data) => {
    const record: PurchaseRecord = {
      id: createId('buy'),
      ownerId: store.getSnapshot().ownerId,
      targetType: input.targetType,
      targetId: input.targetId,
      purchasedAt: input.purchasedAt,
      supplier: input.supplier?.trim() || undefined,
      quantity: input.quantity,
      unit: input.unit,
      amount: input.amount,
      unitCost: purchaseUnitCost(input),
      memo: input.memo?.trim() || undefined,
      createdAt: nowIso(),
    };
    const purchases = [...(data.purchases ?? []), record];
    const next = applyPricingToTargets({ ...data, purchases });
    const result = recalculate(next);
    affected = result.affected;
    return result.data;
  });
  return affected;
}

export function removePurchase(id: string): AffectedMenu[] {
  let affected: AffectedMenu[] = [];
  mutate((data) => {
    const purchases = (data.purchases ?? []).filter((p) => p.id !== id);
    const result = recalculate(applyPricingToTargets({ ...data, purchases }));
    affected = result.affected;
    return result.data;
  });
  return affected;
}

/** 가격 기준(최근/평균)을 바꾸면 적용 가격이 즉시 달라진다. */
export function setPricingMode(
  targetType: 'ingredient' | 'supply',
  targetId: string,
  mode: PricingMode,
): AffectedMenu[] {
  let affected: AffectedMenu[] = [];
  mutate((data) => {
    const next: AppData =
      targetType === 'ingredient'
        ? {
            ...data,
            ingredients: data.ingredients.map((i) =>
              i.id === targetId ? { ...i, pricingMode: mode } : i,
            ),
          }
        : {
            ...data,
            supplies: (data.supplies ?? []).map((s) =>
              s.id === targetId ? { ...s, pricingMode: mode } : s,
            ),
          };
    const result = recalculate(applyPricingToTargets(next));
    affected = result.affected;
    return result.data;
  });
  return affected;
}

/** 매입 이력과 가격 기준에 맞춰 재료·부자재의 현재 적용 가격을 다시 채운다. */
function applyPricingToTargets(data: AppData): AppData {
  const purchases = data.purchases ?? [];
  return {
    ...data,
    ingredients: data.ingredients.map((i) => applyPricingMode(i, purchases, 'ingredient')),
    supplies: (data.supplies ?? []).map((s) => applyPricingMode(s, purchases, 'supply')),
  };
}

/**
 * 여러 건을 한 번에 등록한다. (대량 등록)
 * 남은 자리보다 많이 넘어오면 앞에서부터 자리가 있는 만큼만 등록한다.
 * 반환값의 길이가 inputs 보다 짧으면 한도에 걸려 일부가 등록되지 않은 것이다.
 */
export function addIngredientsBulk(inputs: IngredientInput[]): Ingredient[] {
  const { ownerId, data } = store.getSnapshot();
  const remaining = limitStatus('ingredients', data.ingredients.length).remaining;
  const allowed = inputs.slice(0, remaining);
  const at = nowIso();
  const created = allowed.map<Ingredient>((input) => ({
    id: createId('ing'),
    ownerId,
    name: input.name.trim(),
    price: input.price,
    quantity: input.quantity,
    unit: input.unit,
    memo: input.memo?.trim() || undefined,
    supplier: input.supplier?.trim() || undefined,
    pricingMode: 'manual',
    priceHistory: [
      {
        price: input.price,
        quantity: input.quantity,
        unit: input.unit,
        unitCost: input.quantity > 0 ? input.price / input.quantity : 0,
        at,
      },
    ],
    createdAt: at,
    updatedAt: at,
  }));
  if (created.length === 0) return [];
  mutate((data) => ({ ...data, ingredients: [...created, ...data.ingredients] }));
  return created;
}

/** 남은 자리보다 많이 넘어오면 앞에서부터 자리가 있는 만큼만 등록한다. */
export function addSuppliesBulk(inputs: SupplyInput[]): Supply[] {
  const { ownerId, data } = store.getSnapshot();
  const remaining = limitStatus('supplies', (data.supplies ?? []).length).remaining;
  const allowed = inputs.slice(0, remaining);
  const at = nowIso();
  const created = allowed.map<Supply>((input) => ({
    id: createId('sup'),
    ownerId,
    name: input.name.trim(),
    price: input.price,
    quantity: input.quantity,
    unit: input.unit,
    supplier: input.supplier?.trim() || undefined,
    memo: input.memo?.trim() || undefined,
    pricingMode: 'manual',
    priceHistory: [
      {
        price: input.price,
        quantity: input.quantity,
        unit: input.unit,
        unitCost: input.quantity > 0 ? input.price / input.quantity : 0,
        at,
      },
    ],
    createdAt: at,
    updatedAt: at,
  }));
  if (created.length === 0) return [];
  mutate((data) => ({ ...data, supplies: [...created, ...(data.supplies ?? [])] }));
  return created;
}

export function addCategory(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  mutate((data) =>
    data.customCategories.includes(trimmed)
      ? data
      : { ...data, customCategories: [...data.customCategories, trimmed] },
  );
}

export function loadSampleData(): void {
  const sample = createSampleData(store.getSnapshot().ownerId);
  mutate((data) => ({
    ...data,
    ingredients: [...sample.ingredients, ...data.ingredients],
    menus: [...sample.menus, ...data.menus],
  }));
}

export function clearAll(): void {
  mutate(() => ({ ...EMPTY_DATA }));
}

export interface UseDataResult {
  ready: boolean;
  ownerId: string;
  /** 서버 저장 상태 */
  sync: SyncStatus;
  syncError: string | null;
  retrySync: typeof retrySync;
  ingredients: Ingredient[];
  menus: Menu[];
  preps: Prep[];
  supplies: Supply[];
  purchases: PurchaseRecord[];
  menuViews: MenuView[];
  ingredientMap: Map<string, Ingredient>;
  prepMap: Map<string, Prep>;
  supplyMap: Map<string, Supply>;
  /** 원가 계산에 필요한 저장 데이터 묶음 */
  sources: CostSources;
  /** 무료 요금제 한도 대비 현재 등록 개수 */
  limits: {
    ingredients: LimitStatus;
    preps: LimitStatus;
    menus: LimitStatus;
    supplies: LimitStatus;
  };
  categories: string[];
  addIngredient: typeof addIngredient;
  updateIngredient: typeof updateIngredient;
  removeIngredient: typeof removeIngredient;
  addIngredientsBulk: typeof addIngredientsBulk;
  addSupply: typeof addSupply;
  updateSupply: typeof updateSupply;
  removeSupply: typeof removeSupply;
  addSuppliesBulk: typeof addSuppliesBulk;
  addPrep: typeof addPrep;
  updatePrep: typeof updatePrep;
  removePrep: typeof removePrep;
  duplicatePrep: typeof duplicatePrep;
  addPurchase: typeof addPurchase;
  removePurchase: typeof removePurchase;
  setPricingMode: typeof setPricingMode;
  addMenu: typeof addMenu;
  updateMenu: typeof updateMenu;
  duplicateMenu: typeof duplicateMenu;
  removeMenu: typeof removeMenu;
  addCategory: typeof addCategory;
  loadSampleData: typeof loadSampleData;
  clearAll: typeof clearAll;
}

export function useData(): UseDataResult {
  const { user, ready: authReady } = useAuth();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const ownerId = user?.id ?? GUEST_OWNER;

  // 로그인/로그아웃 시 해당 계정의 데이터로 전환한다. (React 상태가 아닌 외부 저장소 갱신)
  useEffect(() => {
    if (!authReady) return;
    setOwner(ownerId);
  }, [authReady, ownerId]);

  const { ingredients, menus, customCategories } = state.data;
  const preps = useMemo(() => state.data.preps ?? [], [state.data.preps]);
  const supplies = useMemo(() => state.data.supplies ?? [], [state.data.supplies]);
  const purchases = useMemo(() => state.data.purchases ?? [], [state.data.purchases]);

  const ingredientMap = useMemo(() => toIngredientMap(ingredients), [ingredients]);
  const prepMap = useMemo(() => new Map(preps.map((p) => [p.id, p])), [preps]);
  const supplyMap = useMemo(() => new Map(supplies.map((s) => [s.id, s])), [supplies]);
  const sources = useMemo<CostSources>(
    () => ({ ingredients: ingredientMap, preps: prepMap, supplies: supplyMap }),
    [ingredientMap, prepMap, supplyMap],
  );
  const menuViews = useMemo(
    () => menus.map((menu) => buildMenuView(menu, sources)),
    [menus, sources],
  );
  const categories = useMemo(() => mergeCategories(customCategories), [customCategories]);
  const limits = useMemo(
    () => ({
      ingredients: limitStatus('ingredients', ingredients.length),
      preps: limitStatus('preps', preps.length),
      menus: limitStatus('menus', menus.length),
      supplies: limitStatus('supplies', supplies.length),
    }),
    [ingredients.length, preps.length, menus.length, supplies.length],
  );

  return useMemo(
    () => ({
      ready: authReady && state.ready && state.ownerId === ownerId,
      ownerId,
      sync: state.sync,
      syncError: state.syncError,
      retrySync,
      ingredients,
      menus,
      preps,
      supplies,
      purchases,
      menuViews,
      ingredientMap,
      prepMap,
      supplyMap,
      sources,
      limits,
      categories,
      addIngredient,
      updateIngredient,
      removeIngredient,
      addIngredientsBulk,
      addSupply,
      updateSupply,
      removeSupply,
      addSuppliesBulk,
      addPrep,
      updatePrep,
      removePrep,
      duplicatePrep,
      addPurchase,
      removePurchase,
      setPricingMode,
      addMenu,
      updateMenu,
      duplicateMenu,
      removeMenu,
      addCategory,
      loadSampleData,
      clearAll,
    }),
    [
      authReady,
      state.ready,
      state.ownerId,
      state.sync,
      state.syncError,
      ownerId,
      ingredients,
      menus,
      preps,
      supplies,
      purchases,
      menuViews,
      ingredientMap,
      prepMap,
      supplyMap,
      sources,
      limits,
      categories,
    ],
  );
}
