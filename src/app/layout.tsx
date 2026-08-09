import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { Providers } from './providers';
import { SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '음식 원가 계산기 - 무료 메뉴 원가율 계산',
    template: '%s | 원가계산기',
  },
  description:
    '식재료 가격과 사용량만 입력하면 음식 원가, 원가율, 적정 판매가격을 무료로 계산할 수 있습니다.',
  keywords: [
    '음식 원가 계산',
    '음식점 원가 계산기',
    '식당 원가 계산',
    '메뉴 원가 계산',
    '음식 원가율 계산',
    '식재료 원가 계산',
    '카페 원가계산기',
    '음식점 원가율 계산기',
    '적정 판매가격 계산기',
    '원가 관리',
  ],
  applicationName: '원가계산기',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '원가계산기',
    title: '음식 원가 계산기 - 무료 메뉴 원가율 계산',
    description:
      '식재료 가격과 사용량만 입력하면 음식 원가, 원가율, 적정 판매가격을 무료로 계산할 수 있습니다.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: '음식 원가 계산기 - 무료 메뉴 원가율 계산',
    description:
      '식재료 가격과 사용량만 입력하면 음식 원가, 원가율, 적정 판매가격을 무료로 계산할 수 있습니다.',
  },
  robots: { index: true, follow: true },
  verification: {
    // Google Search Console 소유권 확인용
    google: 'LPJwYHhvoTSr724g82kaUTImCdkMEPiQSUZDn2N9t7s',
  },
};

export const viewport: Viewport = {
  themeColor: '#f96a1b',
  width: 'device-width',
  initialScale: 1,
  // 모바일에서 입력 필드를 눌러도 화면이 확대되지 않도록 하되, 사용자 확대는 허용한다.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        <Providers>
          <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <MobileTabBar />
        </Providers>
      </body>
    </html>
  );
}
