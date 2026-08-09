import Link from 'next/link';

/**
 * 브랜드 로고.
 *
 * next/image 대신 일반 img 를 쓴다. 로고는 크기가 작아 최적화 이득이 거의 없고,
 * 이미지 최적화 서버(sharp)에 의존하지 않아 어떤 배포 환경에서도 그대로 표시된다.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label="WongaGo 홈 - 음식 원가 계산기"
    >
      <img
        src="/logo-mark.png"
        alt=""
        width={288}
        height={225}
        aria-hidden="true"
        className="h-8 w-auto"
      />
      <img src="/logo-wordmark.png" alt="WongaGo" width={563} height={117} className="h-5 w-auto" />
    </Link>
  );
}
