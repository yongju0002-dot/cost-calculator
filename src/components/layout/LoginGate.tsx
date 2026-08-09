'use client';

import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/** 로그인이 필요한 화면에서 보여주는 안내 */
export function LoginGate({
  title,
  description,
  next,
}: {
  title: string;
  description: string;
  next: string;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <Card className="text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
          🔒
        </span>
        <h1 className="text-xl font-extrabold text-ink-900">{title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{description}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClass('primary', 'lg')}>
            무료 회원가입 / 로그인
          </Link>
          <Link href="/calculator" className={buttonClass('secondary', 'md')}>
            로그인 없이 원가 계산하기
          </Link>
        </div>
        <p className="mt-4 text-xs text-ink-400">
          기본 원가 계산은 로그인 없이도 무료로 사용할 수 있습니다.
        </p>
      </Card>
    </div>
  );
}
