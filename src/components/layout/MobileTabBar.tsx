'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth';
import {
  IconBox,
  IconCalculator,
  IconHome,
  IconMenuList,
  IconUser,
} from '@/components/ui/Icons';

const TABS = [
  { href: '/', label: '홈', Icon: IconHome, exact: true },
  { href: '/calculator', label: '원가계산', Icon: IconCalculator },
  { href: '/ingredients', label: '재료', Icon: IconBox },
  { href: '/menus', label: '메뉴', Icon: IconMenuList },
];

/** 모바일 하단 고정 네비게이션 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const myHref = user ? '/account' : '/login';
  const tabs = [...TABS, { href: myHref, label: '내정보', Icon: IconUser }];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={label} className="flex-1">
              <Link
                href={href}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
                  active ? 'text-brand-600' : 'text-ink-400'
                }`}
              >
                <Icon width={22} height={22} strokeWidth={active ? 2.1 : 1.7} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
