import type { Metadata } from 'next';
import { CostCalculator } from '@/components/calculator/CostCalculator';

export const metadata: Metadata = {
  title: '메뉴 원가 수정',
  description: '저장한 메뉴의 재료와 판매가격을 수정하면 원가와 원가율이 다시 계산됩니다.',
  robots: { index: false, follow: false },
};

/** 저장된 메뉴 수정 화면. 메뉴 데이터는 브라우저에 저장되어 있어 클라이언트에서 불러온다. */
export default async function EditMenuPage({ params }: PageProps<'/calculator/[menuId]'>) {
  const { menuId } = await params;
  return <CostCalculator menuId={menuId} />;
}
