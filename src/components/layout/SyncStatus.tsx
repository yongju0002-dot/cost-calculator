'use client';

import { useData } from '@/lib/store/data';

/**
 * 서버 저장 상태 표시.
 *
 * 사장님 입장에서 "내가 입력한 게 안전하게 저장됐는지"를 알 수 있어야 하므로
 * 저장 중 / 저장됨 / 실패를 조용히 알려준다. 실패했을 때만 눈에 띄게 만든다.
 */
export function SyncStatus() {
  const { sync, syncError, retrySync } = useData();

  if (sync === 'off') return null;

  if (sync === 'error') {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-800">
          서버에 저장하지 못했습니다. 입력한 내용은 이 기기에 남아 있습니다.
          {syncError ? <span className="ml-1 text-amber-600">({syncError})</span> : null}
        </p>
        <button
          type="button"
          onClick={retrySync}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-amber-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const label =
    sync === 'loading' ? '서버에서 불러오는 중...' : sync === 'saving' ? '저장 중...' : '저장됨';

  return (
    <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink-400">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          sync === 'synced' ? 'bg-emerald-500' : 'bg-ink-300'
        }`}
      />
      {label}
    </p>
  );
}
