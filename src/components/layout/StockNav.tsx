'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 재료 · 프렙 · 부자재를 오가는 서브 네비게이션.
 *
 * 세 화면은 "원가를 구성하는 재료"라는 같은 묶음이라 함께 보여준다.
 * 모바일 하단 탭은 5개로 유지해야 눌리기 편하므로, 이 묶음은 화면 위쪽에 둔다.
 */
const LINKS = [
  { href: '/ingredients', label: '재료' },
  { href: '/preps', label: '프렙' },
  { href: '/supplies', label: '부자재' },
];

export function StockNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-5 flex gap-1 rounded-xl bg-ink-100 p-1">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-bold transition-colors ${
              active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
