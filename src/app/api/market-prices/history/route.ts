import { NextRequest, NextResponse } from 'next/server';
import {
  fetchItemHistory,
  isMarketApiConfigured,
  HISTORY_PERIODS,
  type HistoryPeriod,
  type SalesChannel,
} from '@/lib/market/agromarket';
import { CATALOG, MARKET_REGIONS } from '@/lib/market/catalog';

/**
 * 품목 하나의 기간별 가격 추이.
 *
 * 목록과 달리 사장님이 품목을 눌렀을 때만 부른다. 기간이 길어도 호출 수가 늘지 않도록
 * 기간 안에서 짧은 창 여러 개를 표본으로 뽑는다 (agromarket.ts 의 sampleWindows 참고).
 */
// Next.js 세그먼트 설정은 빌드 시점에 그대로 읽혀야 해서 계산식이 아니라 숫자를 쓴다.
export const revalidate = 21600;

const REVALIDATE_SECONDS = 21600;

export async function GET(request: NextRequest) {
  if (!isMarketApiConfigured()) {
    return NextResponse.json(
      { message: '시세 기능이 아직 준비되지 않았습니다. 잠시 후 다시 확인해주세요.' },
      { status: 503 },
    );
  }

  const params = request.nextUrl.searchParams;

  const cfg = CATALOG.find((c) => c.key === params.get('key'));
  if (!cfg) return NextResponse.json({ message: '품목을 확인해주세요.' }, { status: 400 });

  const rawPeriod = params.get('period');
  const period = (HISTORY_PERIODS as readonly string[]).includes(rawPeriod ?? '')
    ? (rawPeriod as HistoryPeriod)
    : '1m';

  const channel: SalesChannel = params.get('channel') === 'wholesale' ? 'wholesale' : 'retail';

  const rawRegion = params.get('region');
  const region = rawRegion && MARKET_REGIONS.some((r) => r.code === rawRegion) ? rawRegion : null;

  // 품목 하나에 품종이 여러 개일 때, 목록에서 고른 그 품종의 추이를 그대로 보여주기 위한 값.
  // 없으면 조사 시장이 가장 많은 품종을 대표로 쓴다.
  const variety = params.get('variety') ?? undefined;

  try {
    const result = await fetchItemHistory(cfg, channel, region, period, REVALIDATE_SECONDS, variety);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=600`,
      },
    });
  } catch {
    return NextResponse.json(
      { message: '가격 추이를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 502 },
    );
  }
}
