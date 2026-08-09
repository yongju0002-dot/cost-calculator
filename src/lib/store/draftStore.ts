'use client';

import { useSyncExternalStore } from 'react';
import { createEmptyDraft, type Draft } from '@/components/calculator/draft';
import { readJson, storageKeys, writeJson } from '@/lib/storage/local';
import { ExternalStore } from './externalStore';

/**
 * 계산기에서 입력 중인 내용(임시 저장).
 *
 * 로그인하지 않아도 새로고침이나 페이지 이동으로 입력한 값을 잃지 않도록
 * 브라우저에 자동 저장한다. 저장된 메뉴를 수정하는 중에는 임시 저장하지 않는다.
 */

function loadDraft(): Draft {
  const saved = readJson<Draft | null>(storageKeys.draft, null);
  if (saved && Array.isArray(saved.items) && saved.items.length > 0) {
    return { ...createEmptyDraft(), ...saved, menuId: null };
  }
  return createEmptyDraft();
}

const store = new ExternalStore<Draft>(createEmptyDraft, loadDraft);

function persist(draft: Draft): void {
  if (draft.menuId) return;
  writeJson(storageKeys.draft, draft);
}

export function setDraft(updater: Draft | ((prev: Draft) => Draft)): void {
  const next =
    typeof updater === 'function' ? (updater as (prev: Draft) => Draft)(store.getSnapshot()) : updater;
  store.replace(next);
  persist(next);
}

/** 입력 내용을 모두 비운다. */
export function resetDraft(): void {
  const empty = createEmptyDraft();
  store.replace(empty);
  writeJson(storageKeys.draft, empty);
}

/** 브라우저에 임시 저장해 둔 입력 내용을 다시 불러온다. */
export function restorePersistedDraft(): void {
  store.replace(loadDraft());
}

export function useDraft(): Draft {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
