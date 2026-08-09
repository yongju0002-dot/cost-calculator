import type { Metadata } from 'next';
import { CostCalculator } from '@/components/calculator/CostCalculator';

export const metadata: Metadata = {
  title: '음식 원가 계산기 - 재료비·원가율 바로 계산',
  description:
    '재료 구매가격과 사용량을 입력하면 메뉴 원가, 원가율, 적정 판매가격을 실시간으로 계산합니다. 회원가입 없이 무료로 사용하세요.',
  alternates: { canonical: '/calculator' },
};

export default function CalculatorPage() {
  return <CostCalculator />;
}
