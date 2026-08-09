import Link from 'next/link';
import { Logo } from './Logo';

const FOOTER_LINKS = [
  { href: '/calculator', label: '원가 계산기' },
  { href: '/ingredients', label: '내 재료' },
  { href: '/menus', label: '내 메뉴' },
  { href: '/guide', label: '사용 방법' },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-ink-50/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500">
              음식점·카페·분식집·베이커리 사장님을 위한 무료 음식 원가 계산기입니다. 식재료 가격과
              사용량만 입력하면 메뉴 원가, 원가율, 적정 판매가격을 바로 확인할 수 있습니다.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-ink-600 hover:text-brand-600"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 text-xs leading-relaxed text-ink-400">
          기본 원가 계산 기능은 무료입니다. 입력하신 재료·메뉴 정보는 사용 중인 브라우저에 저장되며,
          원가율 기준은 참고용으로 실제 업종과 매장 상황에 따라 다를 수 있습니다.
        </p>
        <p className="mt-2 text-xs text-ink-400">© {new Date().getFullYear()} WongaGo</p>
      </div>
    </footer>
  );
}
