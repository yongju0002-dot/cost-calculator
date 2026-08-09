import type { MetadataRoute } from 'next';

/** 모바일 홈 화면에 추가했을 때 쓰이는 정보 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WongaGo - 음식 원가 계산기',
    short_name: 'WongaGo',
    description:
      '재료 가격과 사용량만 입력하면 메뉴 원가, 원가율, 적정 판매가격을 무료로 계산해 드립니다.',
    start_url: '/calculator',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f96a1b',
    lang: 'ko',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
