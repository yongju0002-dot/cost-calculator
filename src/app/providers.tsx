'use client';

import { ToastProvider } from '@/components/ui/Toast';

/**
 * 인증/데이터 상태는 외부 스토어(useSyncExternalStore)로 관리하므로
 * 전역에 필요한 Provider 는 알림(토스트)뿐이다.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
