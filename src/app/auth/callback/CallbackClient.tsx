'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth/auth';

/**
 * 구글 로그인/가입 확인 메일에서 돌아오는 자리.
 *
 * 주소에 붙어 온 인증 코드는 Supabase 클라이언트가 자동으로 처리한다.
 * 여기서는 로그인이 완료될 때까지 기다렸다가 원래 가려던 화면으로 보내준다.
 */
export function CallbackClient() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [failed, setFailed] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    // 구글에서 거절/취소된 경우 주소에 오류가 담겨 온다.
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error_description') ?? params.get('error');
    if (error) {
      setReason(
        error.includes('access_denied')
          ? '구글 로그인이 취소되었습니다.'
          : '로그인 처리 중 문제가 발생했습니다.',
      );
      setFailed(true);
      return;
    }

    if (!ready) return;

    if (user) {
      const next = params.get('next');
      const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      router.replace(target);
      return;
    }

    // 세션이 잡히기까지 잠깐 걸릴 수 있으니 조금 기다린 뒤에 실패로 처리한다.
    const timer = window.setTimeout(() => setFailed(true), 4000);
    return () => window.clearTimeout(timer);
  }, [ready, user, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <Card className="text-center">
        {failed ? (
          <>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl">
              ⚠️
            </span>
            <h1 className="text-lg font-extrabold text-ink-900">로그인을 완료하지 못했습니다</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
              {reason ?? '로그인 정보가 확인되지 않았습니다. 다시 시도해주세요.'}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/login" className={buttonClass('primary', 'md')}>
                로그인 화면으로
              </Link>
              <Link href="/calculator" className={buttonClass('secondary', 'md')}>
                로그인 없이 원가 계산하기
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
              🍲
            </span>
            <h1 className="text-lg font-extrabold text-ink-900">로그인 중입니다</h1>
            <p className="mt-2 text-[15px] text-ink-500">잠시만 기다려주세요...</p>
          </>
        )}
      </Card>
    </div>
  );
}
