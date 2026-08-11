'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/lib/auth/auth';
import type { Plan } from '@/lib/domain/limits';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { ExternalStore } from './externalStore';

/**
 * 계정 프로필(이름·가게이름·연락처·프로필사진·요금제) 스토어.
 *
 * 프로필은 서버 계정(Supabase)에만 있는 개념이다. 이 브라우저에만 있는 로컬
 * 계정은 이름 외에는 서버에 저장할 곳이 없으므로 항상 FREE 요금제로 취급한다.
 *
 * data.ts 와 마찬가지로 useSyncExternalStore 로 React 밖 상태를 다룬다.
 */

export interface Profile {
  name: string;
  storeName: string;
  phone: string;
  avatarUrl: string;
  plan: Plan;
}

interface ProfileState {
  ownerId: string | null;
  profile: Profile | null;
  /** 서버에서 한 번이라도 읽어왔는지 (아직이면 화면에서 로딩으로 보여준다) */
  ready: boolean;
}

const SERVER_STATE: ProfileState = { ownerId: null, profile: null, ready: false };

const store = new ExternalStore<ProfileState>(() => SERVER_STATE);

function toProfile(row: {
  name: string | null;
  store_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  plan: string | null;
}): Profile {
  const plan: Plan = row.plan === 'PRO' || row.plan === 'BUSINESS' ? row.plan : 'FREE';
  return {
    name: row.name ?? '',
    storeName: row.store_name ?? '',
    phone: row.phone ?? '',
    avatarUrl: row.avatar_url ?? '',
    plan,
  };
}

async function loadProfile(ownerId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    store.replace({ ownerId, profile: null, ready: true });
    return;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('name, store_name, phone, avatar_url, plan')
    .eq('id', ownerId)
    .maybeSingle();

  // 그 사이 로그아웃했거나 다른 사용자로 바뀌었으면 이 결과는 버린다.
  if (store.getSnapshot().ownerId !== ownerId) return;

  if (error || !data) {
    store.replace({ ownerId, profile: null, ready: true });
    return;
  }
  store.replace({ ownerId, profile: toProfile(data), ready: true });
}

function setOwner(ownerId: string | null): void {
  const current = store.getSnapshot();
  if (current.ownerId === ownerId && (current.ready || ownerId === null)) return;
  if (!ownerId) {
    store.replace({ ownerId: null, profile: null, ready: true });
    return;
  }
  store.replace({ ownerId, profile: current.ownerId === ownerId ? current.profile : null, ready: false });
  void loadProfile(ownerId);
}

/**
 * React 밖(예: data.ts 의 한도 계산)에서 현재 요금제를 읽을 때 쓴다.
 * 아직 프로필을 못 읽어왔거나 로컬 계정이면 FREE 로 본다.
 */
export function getCurrentPlan(): Plan {
  return store.getSnapshot().profile?.plan ?? 'FREE';
}

export interface UpdatableProfileFields {
  name: string;
  storeName: string;
  phone: string;
  avatarUrl: string;
}

/** 이용자가 직접 고칠 수 있는 항목만 저장한다. (plan, email 은 여기서 못 바꾼다) */
export async function updateProfile(input: UpdatableProfileFields): Promise<void> {
  const supabase = getSupabase();
  const { ownerId } = store.getSnapshot();
  if (!supabase || !ownerId) throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');

  const name = input.name.trim();
  if (!name) throw new Error('이름을 입력해주세요.');

  const { error } = await supabase
    .from('profiles')
    .update({
      name,
      store_name: input.storeName.trim() || null,
      phone: input.phone.trim() || null,
      avatar_url: input.avatarUrl.trim() || null,
    })
    .eq('id', ownerId);
  if (error) throw new Error('저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');

  const current = store.getSnapshot();
  if (current.profile) {
    store.replace({
      ...current,
      profile: {
        ...current.profile,
        name,
        storeName: input.storeName.trim(),
        phone: input.phone.trim(),
        avatarUrl: input.avatarUrl.trim(),
      },
    });
  }
}

export interface UseProfileResult {
  /** 서버 계정일 때만 값이 있다. 로컬 계정이면 null. */
  profile: Profile | null;
  /** 로그인 상태 확인 + 프로필 조회가 끝났는지 */
  ready: boolean;
  /** 지금 요금제. 프로필이 없으면(로컬 계정 등) FREE. */
  plan: Plan;
  updateProfile: typeof updateProfile;
}

export function useProfile(): UseProfileResult {
  const { user, ready: authReady } = useAuth();
  const ownerId = user?.id ?? null;

  useEffect(() => {
    if (!authReady) return;
    if (!isSupabaseConfigured) {
      setOwner(null);
      return;
    }
    setOwner(ownerId);
  }, [authReady, ownerId]);

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  return useMemo(
    () => ({
      profile: state.ownerId === ownerId ? state.profile : null,
      ready: authReady && (!isSupabaseConfigured || state.ready),
      plan: (state.ownerId === ownerId && state.profile?.plan) || 'FREE',
      updateProfile,
    }),
    [state, ownerId, authReady],
  );
}
