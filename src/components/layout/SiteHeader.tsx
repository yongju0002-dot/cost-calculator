'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth';
import { buttonClass } from '@/components/ui/Button';
import { IconClose, IconMenuBars } from '@/components/ui/Icons';
import { Logo } from './Logo';

export const NAV_LINKS = [
  { href: '/calculator', label: '원가 계산' },
  { href: '/ingredients', label: '재료' },
  { href: '/preps', label: '프렙' },
  { href: '/supplies', label: '부자재' },
  { href: '/menus', label: '메뉴' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, ready, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors ${
                  isActive(link.href)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Link
                href="/dashboard"
                className={`rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                }`}
              >
                대시보드
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {!ready ? null : user ? (
            <>
              <span className="max-w-[10rem] truncate text-sm font-semibold text-ink-600">
                {user.name}님
              </span>
              <Link href="/account" className={buttonClass('secondary', 'sm')}>
                내 계정
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClass('secondary', 'sm')}>
                로그인
              </Link>
              <Link href="/login?mode=signup" className={buttonClass('primary', 'sm')}>
                무료 회원가입
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={open}
          className="-mr-2 rounded-lg p-2 text-ink-700 transition-colors hover:bg-ink-100 md:hidden"
        >
          {open ? <IconClose width={24} height={24} /> : <IconMenuBars width={24} height={24} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-ink-100 bg-white md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={`rounded-lg px-3 py-3 text-[15px] font-semibold ${
                  isActive(link.href) ? 'text-brand-700' : 'text-ink-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 text-[15px] font-semibold text-ink-700"
                >
                  대시보드
                </Link>
                <Link
                  href="/account"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 text-[15px] font-semibold text-ink-700"
                >
                  내 계정 ({user.name})
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="rounded-lg px-3 py-3 text-left text-[15px] font-semibold text-ink-500"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 text-[15px] font-semibold text-ink-700"
                >
                  로그인
                </Link>
                <Link
                  href="/login?mode=signup"
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 text-[15px] font-semibold text-ink-700"
                >
                  무료 회원가입
                </Link>
              </>
            )}
            <Link
              href="/calculator"
              onClick={closeMenu}
              className={buttonClass('primary', 'md', 'my-2 w-full')}
            >
              무료로 원가 계산하기
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
