import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-extrabold tracking-tight text-ink-900 ${className}`}
      aria-label="원가계산기 홈"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-500 text-[15px] font-black text-white shadow-sm">
        ₩
      </span>
      <span className="text-[17px]">원가계산기</span>
    </Link>
  );
}
