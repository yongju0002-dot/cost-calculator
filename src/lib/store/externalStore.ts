/**
 * React 밖에서 상태를 보관하는 작은 스토어.
 *
 * localStorage 처럼 React 외부에 있는 데이터는 useEffect + setState 로 끌어오면
 * 렌더가 연쇄적으로 발생한다. useSyncExternalStore 와 함께 쓰도록 만들어
 * 서버 렌더 결과(로그아웃 상태)와 클라이언트 하이드레이션을 안전하게 맞춘다.
 */
export class ExternalStore<T> {
  private listeners = new Set<() => void>();
  private state: T | undefined;
  private serverState: T | undefined;
  private hydrated = false;

  constructor(
    /**
     * 서버 렌더링 시점의 상태 (브라우저 저장소를 읽을 수 없다).
     * 모듈 로드 순서에 영향을 받지 않도록 함수로 받아 처음 필요할 때 한 번만 만든다.
     */
    private readonly createServerState: () => T,
    /** 브라우저에서 처음 구독될 때 실제 데이터를 읽어오는 함수 */
    private readonly hydrator?: () => T,
  ) {}

  getSnapshot = (): T => {
    if (this.state === undefined) this.state = this.getServerSnapshot();
    return this.state;
  };

  getServerSnapshot = (): T => {
    if (this.serverState === undefined) this.serverState = this.createServerState();
    return this.serverState;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    this.hydrate();
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** 최초 1회만 브라우저 저장소에서 상태를 읽어온다. */
  hydrate(): void {
    if (this.hydrated || !this.hydrator) return;
    this.hydrated = true;
    this.replace(this.hydrator());
  }

  set(updater: T | ((prev: T) => T)): void {
    const next =
      typeof updater === 'function' ? (updater as (prev: T) => T)(this.getSnapshot()) : updater;
    this.replace(next);
  }

  /** 하이드레이션 여부와 관계없이 상태를 교체한다. */
  replace(next: T): void {
    if (Object.is(next, this.getSnapshot())) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  }
}
