'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getSupabase } from '@/lib/supabase/client';

/**
 * 이메일 인증 확인 링크가 도착하는 자리.
 *
 * Supabase 기본 확인 링크({{ .ConfirmationURL }})는 PKCE 방식이라
 * 가입할 때 쓴 바로 그 브라우저에서 열어야만 동작한다. 메일 앱이나 다른
 * 기기·브라우저에서 열면 인증에 실패한다.
 *
 * 이를 피하려고 이메일 템플릿에서 token_hash 를 직접 받아 verifyOtp() 로
 * 확인하는 방식을 쓴다. 이 방식은 어떤 기기·브라우저에서 열어도 동작한다.
 * (이메일 템플릿의 링크를 이 페이지로 오도록 바꿔야 적용된다.)
 */
export function ConfirmClient() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'failed'>('checking');
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type') as EmailOtpType | null;
    const next = params.get('next');
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

    const supabase = getSupabase();
    if (!tokenHash || !type || !supabase) {
      setReason('인증 링크가 올바르지 않습니다. 메일에서 링크를 다시 확인해주세요.');
      setStatus('failed');
      return;
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) {
        setReason(
          error.message.toLowerCase().includes('expired')
            ? '인증 링크가 만료되었습니다. 다시 가입을 시도해주세요.'
            : '인증 링크가 이미 사용되었거나 올바르지 않습니다.',
        );
        setStatus('failed');
        return;
      }
      router.replace(target);
    });
  }, [router]);

  if (status === 'failed') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
        <Card className="text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl">
            ⚠️
          </span>
          <h1 className="text-lg font-extrabold text-ink-900">이메일 인증에 실패했습니다</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{reason}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/login" className={buttonClass('primary', 'md')}>
              로그인 화면으로
            </Link>
            <Link href="/calculator" className={buttonClass('secondary', 'md')}>
              로그인 없이 원가 계산하기
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <Card className="text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
          🍲
        </span>
        <h1 className="text-lg font-extrabold text-ink-900">이메일 인증 중입니다</h1>
        <p className="mt-2 text-[15px] text-ink-500">잠시만 기다려주세요...</p>
      </Card>
    </div>
  );
}
