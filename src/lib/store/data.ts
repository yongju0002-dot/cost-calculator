'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/lib/auth/auth';
import { mergeCategories } from '@/lib/domain/categories';
import { computeMenuCost } from '@/lib/domain/cost';
import { buildMenuView, type MenuView } from '@/lib/domain/menuView';
import { createSampleData } from '@/lib/domain/sample';
import type { AppData, Ingredient, Menu, RecipeItem } from '@/lib/domain/types';
import { isUnit, type Unit } from '@/lib/domain/units';
import { createId, isBrowser, nowIso, readJson, storageKeys, writeJson } from '@/lib/storage/local';
import { ExternalStore } from './externalStore';

/**
 * 재료·메뉴 데이터 저장소.
 *
 * 지금은 브라우저 localStorage 에 계정별로 저장한다.
 * 서버 DB 로 옮길 때는 readData/persist 두 함수만 교체하면 되도록 분리해 두었다.
 */

export const GUEST_OWNER = 'guest';

const EMPTY_DATA: AppData = { version: 1, ingredients: [], menus: [], customCategories: [] };

export interface IngredientInput {
  name: string;
  price: number;
  quantity: number;
  unit: Unit;
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

interface DataState {
  ownerId: string;
  data: AppData;
  /** 브라우저 저장소에서 데이터를 읽어왔는지 여부 */
  ready: boolean;
}

const SERVER_STATE: DataState = { ownerId: GUEST_OWNER, data: EMPTY_DATA, ready: false };

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
  };
}

function readData(ownerId: string): AppData {
  return normalizeData(readJson(storageKeys.data(ownerId), EMPTY_DATA));
}

const store = new ExternalStore<DataState>(
  () => SERVER_STATE,
  () => ({ ownerId: GUEST_OWNER, data: readData(GUEST_OWNER), ready: true }),
);

// 다른 탭에서 데이터를 바꿨다면 현재 탭에도 반영한다.
if (isBrowser()) {
  window.addEventListener('storage', (event) => {
    const { ownerId } = store.getSnapshot();
    if (event.key === storageKeys.data(ownerId)) {
      store.replace({ ownerId, data: readData(ownerId), ready: true });
    }
  });
}

/** 로그인 상태가 바뀌면 해당 계정의 데이터로 교체한다. */
function setOwner(ownerId: string): void {
  const current = store.getSnapshot();
  if (current.ready && current.ownerId === ownerId) return;
  store.replace({ ownerId, data: readData(ownerId), ready: true });
}

function mutate(updater: (data: AppData) => AppData): void {
  const { ownerId, data } = store.getSnapshot();
  const next = updater(data);
  if (next === data) return;
  writeJson(storageKeys.data(ownerId), next);
  store.replace({ ownerId, data: next, ready: true });
}

function toIngredientMap(ingredients: Ingredient[]): Map<string, Ingredient> {
  return new Map(ingredients.map((i) => [i.id, i]));
}

/**
 * 재료 변경 후 메뉴 원가를 다시 계산하고, 값이 바뀐 메뉴에는 원가 이력을 남긴다.
 * (재료 가격을 수정하면 관련 메뉴 원가가 자동으로 갱신되는 지점)
 */
function recalculateMenus(
  menus: Menu[],
  ingredients: Ingredient[],
): { menus: Menu[]; affected: AffectedMenu[] } {
  const map = toIngredientMap(ingredients);
  const at = nowIso();
  const affected: AffectedMenu[] = [];
  const nextMenus = menus.map((menu) => {
    const currentCost = computeMenuCost(menu, map);
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
  return { menus: nextMenus, affected };
}

export function addIngredient(input: IngredientInput): Ingredient {
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
    const result = recalculateMenus(data.menus, ingredients);
    affected = result.affected;
    return { ...data, ingredients, menus: result.menus };
  });
  return affected;
}

export function removeIngredient(id: string): void {
  mutate((data) => ({
    ...data,
    ingredients: data.ingredients.filter((i) => i.id !== id),
    // 삭제된 재료를 쓰던 메뉴는 마지막 가격을 그대로 유지한 채 연결만 끊는다.
    menus: data.menus.map((menu) =>
      menu.items.some((item) => item.ingredientId === id)
        ? {
            ...menu,
            items: menu.items.map((item) =>
              item.ingredientId === id ? { ...item, ingredientId: null } : item,
            ),
          }
        : menu,
    ),
  }));
}

export function addMenu(input: MenuInput): Menu {
  const at = nowIso();
  const { data, ownerId } = store.getSnapshot();
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
    costHistory: [{ cost: computeMenuCost(base, toIngredientMap(data.ingredients)), at }],
  };
  mutate((prev) => ({ ...prev, menus: [menu, ...prev.menus] }));
  return menu;
}

export function updateMenu(id: string, input: MenuInput): Menu | null {
  let updated: Menu | null = null;
  mutate((data) => {
    const at = nowIso();
    const map = toIngredientMap(data.ingredients);
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

export function duplicateMenu(id: string): Menu | null {
  const source = store.getSnapshot().data.menus.find((m) => m.id === id);
  if (!source) return null;
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
  ingredients: Ingredient[];
  menus: Menu[];
  menuViews: MenuView[];
  ingredientMap: Map<string, Ingredient>;
  categories: string[];
  addIngredient: typeof addIngredient;
  updateIngredient: typeof updateIngredient;
  removeIngredient: typeof removeIngredient;
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

  const ingredientMap = useMemo(() => toIngredientMap(ingredients), [ingredients]);
  const menuViews = useMemo(
    () => menus.map((menu) => buildMenuView(menu, ingredientMap)),
    [menus, ingredientMap],
  );
  const categories = useMemo(() => mergeCategories(customCategories), [customCategories]);

  return useMemo(
    () => ({
      ready: authReady && state.ready && state.ownerId === ownerId,
      ownerId,
      ingredients,
      menus,
      menuViews,
      ingredientMap,
      categories,
      addIngredient,
      updateIngredient,
      removeIngredient,
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
      ownerId,
      ingredients,
      menus,
      menuViews,
      ingredientMap,
      categories,
    ],
  );
}
