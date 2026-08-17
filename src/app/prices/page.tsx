import type { Metadata } from 'next';
import { MarketPricesClient } from './MarketPricesClient';

export const metadata: Metadata = {
  title: '농산물 시세 - 식자재 도매·소매 가격',
  description:
    '양파, 대파, 배추, 돼지고기 등 주요 식자재의 최근 도매·소매 가격과 지난주 대비 변동률을 확인하세요. 한국농수산식품유통공사 조사 자료 기준입니다.',
  alternates: { canonical: '/prices' },
};

export default function PricesPage() {
  return <MarketPricesClient />;
}
