import type { Metadata } from 'next';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = {
  title: '대시보드 - 평균 원가율과 원가 변동 요약',
  description:
    '저장된 재료와 메뉴 수, 평균 원가율, 원가가 오른 메뉴, 최근 가격이 변경된 식재료를 한 화면에서 확인하세요.',
  alternates: { canonical: '/dashboard' },
  robots: { index: false, follow: true },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
