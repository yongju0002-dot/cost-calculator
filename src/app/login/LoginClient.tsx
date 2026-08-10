'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox, PasswordField, TextField } from '@/components/ui/Field';
import { IconCheck } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/auth';

const MIN_PASSWORD_LENGTH = 6;

type Mode = 'signin' | 'signup';

export function LoginClient() {
  const router = useRouter();
  const { user, ready, signIn, signUp, signInWithGoogle, signOut, isServerAuth } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  /** 가입 확인 메일을 보낸 경우, 안내 화면으로 전환한다. */
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);

  const passwordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const confirmError =
    mode === 'signup' && touchedConfirm && passwordConfirm.length > 0 && !passwordsMatch
      ? '비밀번호가 일치하지 않습니다.'
      : null;

  /**
   * 로그인 후 돌아갈 주소. 렌더 중이 아니라 실제로 이동할 때 읽는다.
   * (next=/menus 처럼 앱 내부 경로만 허용한다.)
   */
  const nextPath = (): string => {
    if (typeof window === 'undefined') return '/dashboard';
    const value = new URLSearchParams(window.location.search).get('next');
    return value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!passwordsMatch) {
        setTouchedConfirm(true);
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (!agreeTerms || !agreePrivacy) {
        setError('이용약관과 개인정보 수집·이용에 모두 동의해주세요.');
        return;
      }
    }

    setPending(true);
    try {
      if (mode === 'signup') {
        const result = await signUp({ email, password, name });
        if (result.needsEmailConfirm) {
          setConfirmSentTo(email);
          return;
        }
        showToast('가입이 완료되었습니다. 이제 재료와 메뉴를 저장할 수 있어요.', 'success');
      } else {
        await signIn({ email, password });
        showToast('로그인되었습니다.', 'success');
      }
      router.push(nextPath());
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setPending(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      // 성공하면 구글 로그인 화면으로 이동하고, 끝나면 /auth/callback 으로 돌아온다.
      await signInWithGoogle(nextPath());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google 로그인을 사용할 수 없습니다.');
    }
  };

  if (!ready) return null;

  if (confirmSentTo) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Card className="text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
            ✉️
          </span>
          <h1 className="text-lg font-extrabold text-ink-900">확인 메일을 보냈습니다</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
            <b className="text-ink-700">{confirmSentTo}</b> 로 보낸 메일에서 링크를 눌러주시면 가입이
            완료됩니다. 메일이 보이지 않으면 스팸함도 확인해주세요.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="secondary" onClick={() => setConfirmSentTo(null)}>
              다른 이메일로 가입하기
            </Button>
            <Link href="/calculator" className={buttonClass('ghost', 'md')}>
              먼저 원가 계산부터 해보기
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
        <Card>
          <h1 className="text-xl font-extrabold text-ink-900">내 정보</h1>
          <dl className="mt-5 flex flex-col gap-2 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-500">이름</dt>
              <dd className="font-semibold text-ink-900">{user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">이메일</dt>
              <dd className="font-semibold text-ink-900">{user.email}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/dashboard" className={buttonClass('primary', 'md')}>
              대시보드 보기
            </Link>
            <Link href="/menus" className={buttonClass('secondary', 'md')}>
              내 메뉴 보기
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                signOut();
                showToast('로그아웃되었습니다.');
              }}
            >
              로그아웃
            </Button>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-ink-400">
            {isServerAuth
              ? '계정은 서버에 안전하게 보관되어 다른 기기에서도 같은 계정으로 로그인할 수 있습니다.'
              : '재료·메뉴 정보는 지금 사용 중인 브라우저에 저장됩니다. 다른 기기에서 보려면 해당 기기에서 다시 가입해주세요.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          {mode === 'signin' ? '로그인' : '무료 회원가입'}
        </h1>
        <p className="mt-2 text-[15px] text-ink-500">
          회원가입하면 재료·메뉴 저장, 원가 변동 관리, 대시보드를 사용할 수 있습니다.
        </p>
      </div>

      <Card className="mt-6">
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-ink-100 p-1">
          {(['signin', 'signup'] as Mode[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              className={`h-10 rounded-lg text-sm font-bold transition-colors ${
                mode === value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'
              }`}
            >
              {value === 'signin' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' ? (
            <TextField
              label="이름 (또는 가게 이름)"
              placeholder="예) 행복식당"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
            />
          ) : null}
          <TextField
            label="이메일"
            type="email"
            inputMode="email"
            placeholder="owner@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <PasswordField
            label="비밀번호"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
          />
          {mode === 'signup' && password.length > 0 ? (
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

          {mode === 'signup' ? (
            <PasswordField
              label="비밀번호 확인"
              placeholder="비밀번호를 한 번 더 입력해주세요"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              onBlur={() => setTouchedConfirm(true)}
              autoComplete="new-password"
              error={confirmError}
              required
            />
          ) : null}

          {mode === 'signup' ? (
            <div className="mt-1 flex flex-col gap-2 rounded-xl bg-ink-50 p-4">
              <Checkbox
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                label={
                  <>
                    (필수){' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-600 underline"
                    >
                      이용약관
                    </Link>
                    에 동의합니다
                  </>
                }
              />
              <Checkbox
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                label={
                  <>
                    (필수){' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-600 underline"
                    >
                      개인정보 수집 및 이용
                    </Link>
                    에 동의합니다
                  </>
                }
              />
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
          ) : null}

          <Button type="submit" size="lg" disabled={pending} className="mt-1">
            {pending ? '처리 중...' : mode === 'signin' ? '로그인' : '가입하고 시작하기'}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-ink-200" />
          <span className="text-xs font-semibold text-ink-400">또는</span>
          <span className="h-px flex-1 bg-ink-200" />
        </div>

        <Button variant="secondary" size="lg" className="w-full" onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
            />
          </svg>
          Google로 계속하기
        </Button>

        <p className="mt-5 text-center text-sm text-ink-500">
          로그인 없이도{' '}
          <Link href="/calculator" className="font-semibold text-brand-600 underline">
            원가 계산
          </Link>
          은 무료로 사용할 수 있습니다.
        </p>
      </Card>

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-400">
        {isServerAuth
          ? '가입하면 다른 기기에서도 같은 계정으로 로그인할 수 있습니다.'
          : '계정과 저장 데이터는 지금 사용 중인 브라우저에만 보관되며 외부로 전송되지 않습니다.'}
      </p>
    </div>
  );
}
