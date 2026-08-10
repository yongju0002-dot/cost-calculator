import type { Metadata } from 'next';
import { CallbackClient } from './CallbackClient';

export const metadata: Metadata = {
  title: '로그인 처리 중',
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return <CallbackClient />;
}
