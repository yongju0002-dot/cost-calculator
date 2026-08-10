import type { Metadata } from 'next';
import { PrepsClient } from './PrepsClient';

export const metadata: Metadata = {
  title: '프렙 관리 - 양념장·육수 원가 계산',
  description:
    '여러 재료로 미리 만들어두는 양념장·육수의 원가를 계산하고, 메뉴에서 사용한 만큼만 원가에 반영합니다.',
  alternates: { canonical: '/preps' },
};

export default function PrepsPage() {
  return <PrepsClient />;
}
