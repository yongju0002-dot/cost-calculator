'use client';

import type { AppData } from '@/lib/domain/types';
import { getSupabase } from '@/lib/supabase/client';

/**
 * 서버(Supabase) 저장.
 *
 * 브라우저가 항상 원본을 들고 계산하고, 서버에는 그 내용을 통째로 올려둔다.
 * 다른 기기에서 로그인하면 서버에 있는 내용을 받아와 이어서 쓴다.
 *
 * 저장이 실패해도 브라우저 저장소에는 남아 있으므로 입력한 내용이 사라지지 않는다.
 */

const TABLE = 'app_data';

export interface RemoteSnapshot {
  data: AppData;
  updatedAt: string | null;
}

/** 서버에 저장된 내용을 가져온다. 없으면 null. */
export async function fetchRemoteData(userId: string): Promise<RemoteSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.data) return null;

  return { data: data.data as AppData, updatedAt: data.updated_at ?? null };
}

/** 현재 내용을 서버에 저장한다. */
export async function pushRemoteData(userId: string, appData: AppData): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, data: appData }, { onConflict: 'user_id' });

  if (error) throw new Error(error.message);
}

/** 재료·프렙·부자재·메뉴가 하나도 없는 상태인지 */
export function isEmptyData(data: AppData): boolean {
  return (
    data.ingredients.length === 0 &&
    data.menus.length === 0 &&
    (data.preps?.length ?? 0) === 0 &&
    (data.supplies?.length ?? 0) === 0
  );
}
