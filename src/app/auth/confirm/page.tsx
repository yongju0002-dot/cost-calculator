import type { Metadata } from 'next';
import { ConfirmClient } from './ConfirmClient';

export const metadata: Metadata = {
  title: '이메일 인증 처리 중',
  robots: { index: false, follow: false },
};

export default function AuthConfirmPage() {
  return <ConfirmClient />;
}
