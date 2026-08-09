import type { Metadata } from 'next';
import { MenusClient } from './MenusClient';

export const metadata: Metadata = {
  title: '내 메뉴 관리 - 메뉴별 원가율 한눈에 보기',
  description:
    '저장한 메뉴의 재료 원가, 판매가격, 원가율을 카드로 확인하고 검색·카테고리로 정리하세요. 원가가 오른 메뉴도 바로 알 수 있습니다.',
  alternates: { canonical: '/menus' },
};

export default function MenusPage() {
  return <MenusClient />;
}
