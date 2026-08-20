import type { Metadata } from 'next';
import { fetchGroupPrices, isMarketApiConfigured, type MarketPricesResult } from '@/lib/market/agromarket';
import { cachedValue } from '@/lib/market/cache';
import { MARKET_GROUPS, type MarketGroup } from '@/lib/market/catalog';
import { MarketPricesClient } from './MarketPricesClient';

export const metadata: Metadata = {
  title: '농산물 시세 - 식자재 도매·소매 가격',
  description:
    '양파, 대파, 배추, 돼지고기 등 주요 식자재의 최근 도매·소매 가격과 지난주 대비 변동률을 확인하세요. 한국농수산식품유통공사 조사 자료 기준입니다.',
  alternates: { canonical: '/prices' },
};

const REVALIDATE_SECONDS = 21600;

/**
 * 목록 기본값(소매·전국)을 서버에서 미리 채워 넘긴다.
 *
 * 예전에는 이 페이지 전체가 클라이언트에서 fetch 하는 화면이라, 크롤러가 처음 받는
 * HTML 에는 가격이 하나도 없었다(로딩 스켈레톤만 있는 빈 껍데기). 목록/api 라우트가
 * 쓰는 것과 똑같은 캐시 키로 직접 불러오므로, 서버가 이미 미리 채워둔 값이 있으면
 * (instrumentation.ts) 추가 호출 없이 즉시 채워진 채로 나간다.
 */
async function loadInitialGroups(): Promise<Partial<Record<MarketGroup, MarketPricesResult>>> {
  if (!isMarketApiConfigured()) return {};

  const entries = await Promise.all(
    MARKET_GROUPS.map(async (group) => {
      try {
        const result = await cachedValue(`prices|${group}|retail|`, REVALIDATE_SECONDS * 1000, () =>
          fetchGroupPrices(group, 'retail', null, REVALIDATE_SECONDS),
        );
        return [group, result] as const;
      } catch {
        return [group, null] as const;
      }
    }),
  );

  return Object.fromEntries(entries.filter((e): e is [MarketGroup, MarketPricesResult] => e[1] !== null));
}

export default async function PricesPage() {
  const initialGroups = await loadInitialGroups();
  return <MarketPricesClient initialGroups={initialGroups} />;
}
