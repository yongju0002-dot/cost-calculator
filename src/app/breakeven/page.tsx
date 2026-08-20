import type { Metadata } from 'next';
import { BreakevenClient } from './BreakevenClient';

export const metadata: Metadata = {
  title: '손익분기점 계산 - 월 고정비로 보는 본전 매출',
  description:
    '임대료·인건비·공과금 같은 월 고정비를 입력하면 한 달에 얼마를 팔아야 본전인지, 메뉴를 몇 개 팔아야 하는지 계산합니다.',
  alternates: { canonical: '/breakeven' },
};

export default function BreakevenPage() {
  return <BreakevenClient />;
}
