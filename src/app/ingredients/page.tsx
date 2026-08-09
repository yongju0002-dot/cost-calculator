import type { Metadata } from 'next';
import { IngredientsClient } from './IngredientsClient';

export const metadata: Metadata = {
  title: '내 재료 관리 - 식재료 단위 원가 계산',
  description:
    '자주 쓰는 식재료의 구매가격과 구매수량을 저장하면 1g당, 1개당 단위 원가를 자동으로 계산합니다. 가격을 수정하면 관련 메뉴 원가도 함께 갱신됩니다.',
  alternates: { canonical: '/ingredients' },
};

export default function IngredientsPage() {
  return <IngredientsClient />;
}
