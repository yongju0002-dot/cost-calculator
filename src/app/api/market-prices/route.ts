import { NextRequest, NextResponse } from 'next/server';
import {
  fetchMarketPrices,
  isMarketApiConfigured,
  type SalesChannel,
} from '@/lib/market/agromarket';

/**
 * 농산물 시세 조회.
 *
 * 공공데이터포털 API 는 브라우저에서 직접 부를 수 없고(CORS) 인증키도 노출되면 안 되므로
 * 서버가 대신 호출한다.
 *
 * 개발계정 하루 허용량이 10,000건이고 한 번 갱신에 최대 100여 건을 쓰므로,
 * 결과를 6시간 캐시해서 여유를 크게 둔다. (시세 자체가 하루 1회 갱신되는 데이터다)
 */
// 6시간. Next.js 의 세그먼트 설정은 빌드 시점에 그대로 읽을 수 있어야 하므로
// 변수나 계산식(60 * 60 * 6)이 아니라 숫자를 그대로 써야 한다.
export const revalidate = 21600;

const REVALIDATE_SECONDS = 21600;

export async function GET(request: NextRequest) {
  if (!isMarketApiConfigured()) {
    return NextResponse.json(
      { message: '시세 기능이 아직 준비되지 않았습니다. 잠시 후 다시 확인해주세요.' },
      { status: 503 },
    );
  }

  const raw = request.nextUrl.searchParams.get('channel');
  const channel: SalesChannel = raw === 'wholesale' ? 'wholesale' : 'retail';

  try {
    const result = await fetchMarketPrices(channel, REVALIDATE_SECONDS);
    return NextResponse.json(
      { channel, ...result },
      {
        headers: {
          // 브라우저·CDN 에서도 잠시 재사용하게 해 불필요한 재조회를 줄인다.
          'Cache-Control': `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=600`,
        },
      },
    );
  } catch {
    return NextResponse.json(
      { message: '시세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 502 },
    );
  }
}
