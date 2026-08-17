import 'server-only';

/**
 * 시세 집계 결과를 서버 메모리에 들고 있는 아주 작은 캐시.
 *
 * 왜 필요한가:
 * 공공 API 는 품목코드가 필수라 품목당 한 번씩 불러야 하고, 건당 응답이 200ms~3초로
 * 불규칙하다. 그래서 전체를 처음 모으는 데 10초 이상 걸린다. 캐시가 만료되는 순간에
 * 들어온 사장님이 그 10초를 그대로 기다리게 되면 안 된다.
 *
 * 그래서 "오래됐어도 값이 있으면 그걸 바로 주고, 갱신은 뒤에서 한다"(stale-while-revalidate).
 * 덕분에 서버가 켜진 뒤 한 번만 채워지면 그 뒤로는 기다리는 사람이 없다.
 *
 * 같은 키에 대한 갱신이 동시에 여러 번 돌지 않도록 진행 중인 작업을 공유한다.
 */

interface Entry<T> {
  value: T;
  at: number;
}

const store = new Map<string, Entry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

function refresh<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) return running;

  const task = loader()
    .then((value) => {
      store.set(key, { value, at: Date.now() });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, task);
  return task;
}

export async function cachedValue<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit) {
    if (Date.now() - hit.at < ttlMs) return hit.value;
    // 오래된 값이라도 바로 돌려주고 갱신은 뒤에서 한다.
    // (실패해도 다음 요청에서 다시 시도하므로 여기서는 조용히 넘긴다)
    void refresh(key, loader).catch(() => {});
    return hit.value;
  }

  return refresh(key, loader);
}

/** 값이 이미 있는지 (warm-up 이 필요한지 판단할 때 쓴다) */
export function hasCachedValue(key: string): boolean {
  return store.has(key);
}
