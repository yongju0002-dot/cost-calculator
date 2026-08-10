import type { Metadata } from 'next';
import { SuppliesClient } from './SuppliesClient';

export const metadata: Metadata = {
  title: '부자재 관리 - 포장용기·소모품 원가 계산',
  description:
    '도시락 용기, 젓가락, 냅킨처럼 메뉴와 함께 나가는 부자재의 개당 가격을 계산하고 메뉴 원가에 자동으로 더합니다.',
  alternates: { canonical: '/supplies' },
};

export default function SuppliesPage() {
  return <SuppliesClient />;
}
