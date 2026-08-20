'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth';
import { Logo } from './Logo';

const SERVICE_LINKS = [
  { href: '/calculator', label: '원가 계산' },
  { href: '/ingredients', label: '재료' },
  { href: '/preps', label: '프렙' },
  { href: '/supplies', label: '부자재' },
  { href: '/menus', label: '메뉴' },
  { href: '/breakeven', label: '손익분기점' },
  { href: '/guide', label: '사용 방법' },
];

const POLICY_LINKS = [
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침' },
];

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{title}</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm font-semibold text-ink-600 hover:text-brand-600">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const { user, ready } = useAuth();

  const accountLinks =
    ready && user
      ? [{ href: '/account', label: '내 계정' }]
      : [
          { href: '/login', label: '로그인' },
          { href: '/login?mode=signup', label: '회원가입' },
        ];

  return (
    <footer className="mt-16 border-t border-ink-200 bg-ink-50/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500">
              사장님을 위한 쉬운 원가관리. 재료·프렙·부자재부터 메뉴 원가까지 한곳에서 관리하세요.
            </p>
          </div>
          <FooterLinkGroup title="서비스" links={SERVICE_LINKS} />
          <FooterLinkGroup title="계정" links={accountLinks} />
          <FooterLinkGroup title="정책" links={POLICY_LINKS} />
        </div>

        <p className="mt-10 text-xs leading-relaxed text-ink-400">
          기본 원가 계산 기능은 무료입니다. 입력하신 재료·메뉴 정보는 사용 중인 브라우저 또는 로그인한
          계정에 저장되며, 원가율 기준은 참고용으로 실제 업종과 매장 상황에 따라 다를 수 있습니다.
        </p>
        <p className="mt-4 text-xs text-ink-400">
          © {new Date().getFullYear()} WongaGo. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
