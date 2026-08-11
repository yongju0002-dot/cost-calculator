'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buttonClass, Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PasswordField } from '@/components/ui/Field';
import { IconCheck } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { updatePasswordAfterReset } from '@/lib/auth/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

const MIN_PASSWORD_LENGTH = 6;

/**
 * 비밀번호 재설정 메일의 링크 → /auth/confirm(verifyOtp) → 여기로 온다.
 * 이 시점에는 이미 임시 세션이 있는 상태라, 그 세션으로 새 비밀번호를 설정한다.
 */
export function ResetPasswordClient() {
  const router = useRouter();
  const { showToast } = useToast();

  const [checking, setChecking] = useState(isSupabaseConfigured);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  const passwordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const confirmError =
    touchedConfirm && passwordConfirm.length > 0 && !passwordsMatch
      ? '비밀번호가 일치하지 않습니다.'
      : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!passwordsMatch) {
      setTouchedConfirm(true);
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setPending(true);
    try {
      await updatePasswordAfterReset(password);
      setDone(true);
      showToast('비밀번호가 변경되었습니다.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setPending(false);
    }
  };

  if (checking) return null;

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Card className="text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            ✅
          </span>
          <h1 className="text-lg font-extrabold text-ink-900">비밀번호가 변경되었습니다</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
            새 비밀번호로 다시 로그인해주세요.
          </p>
          <div className="mt-6">
            <Button size="lg" onClick={() => router.push('/login')}>
              로그인하러 가기
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!isSupabaseConfigured || !hasSession) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Card className="text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl">
            ⚠️
          </span>
          <h1 className="text-lg font-extrabold text-ink-900">링크가 만료되었거나 올바르지 않습니다</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
            로그인 화면에서 &quot;비밀번호를 잊으셨나요?&quot;를 눌러 재설정 메일을 다시
            요청해주세요.
          </p>
          <div className="mt-6">
            <Link href="/login" className={buttonClass('primary', 'md')}>
              로그인 화면으로
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">새 비밀번호 설정</h1>
        <p className="mt-2 text-[15px] text-ink-500">새로 사용할 비밀번호를 입력해주세요.</p>
      </div>
      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <PasswordField
            label="새 비밀번호"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          {password.length > 0 ? (
            <p
              className={`-mt-1.5 flex items-center gap-1 pl-1 text-xs font-semibold ${
                passwordLongEnough ? 'text-emerald-600' : 'text-ink-400'
              }`}
            >
              <IconCheck
                width={13}
                height={13}
                strokeWidth={3}
                className={passwordLongEnough ? 'opacity-100' : 'opacity-30'}
              />
              6자 이상 입력해주세요
            </p>
          ) : null}
          <PasswordField
            label="새 비밀번호 확인"
            placeholder="한 번 더 입력해주세요"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            onBlur={() => setTouchedConfirm(true)}
            autoComplete="new-password"
            error={confirmError}
            required
          />
          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
          ) : null}
          <Button type="submit" size="lg" disabled={pending} className="mt-1">
            {pending ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
