import type { Metadata } from 'next';
import { LoginClient } from './LoginClient';

export const metadata: Metadata = {
  title: '로그인 · 무료 회원가입',
  description:
    '무료로 가입하면 자주 쓰는 식재료와 메뉴 원가를 저장하고, 재료 가격이 바뀔 때 메뉴 원가를 자동으로 관리할 수 있습니다.',
  alternates: { canonical: '/login' },
};

export default function LoginPage() {
  return <LoginClient />;
}
