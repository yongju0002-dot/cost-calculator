import type { Metadata } from 'next';
import { AccountClient } from './AccountClient';

export const metadata: Metadata = {
  title: '내 계정',
  description: '계정 정보, 요금제, 비밀번호·이메일 변경, 회원 탈퇴를 관리합니다.',
  alternates: { canonical: '/account' },
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountClient />;
}
