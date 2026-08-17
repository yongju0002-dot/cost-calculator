import { NextRequest, NextResponse } from 'next/server';
import { fetchGroupPrices, isMarketApiConfigured, type SalesChannel } from '@/lib/market/agromarket';
import { MARKET_GROUPS, MARKET_REGIONS, type MarketGroup } from '@/lib/market/catalog';

/**
 * 농산물 시세 조회. 분류(group) 단위로 부른다.
 *
 * 공공데이터포털 API 는 브라우저에서 직접 부를 수 없고(CORS) 인증키도 노출되면 안 되므로
 * 서버가 대신 호출한다. 그 API 는 품목코드가 필수라 품목당 한 번씩 불러야 해서, 전체를
 * 한 번에 부르면 응답이 너무 느려진다. 그래서 분류별로 나누고 화면이 나눠 받는다.
 *
 * 지역(region)은 이미 받아온 데이터에서 걸러내기만 하므로, 지역을 바꿔도 외부 API 를
 * 다시 부르지 않는다 (같은 주소로 조회해 캐시가 재사용된다).
 *
 * 6시간 캐시. 시세 자체가 하루 1회 갱신되는 자료이고, 개발계정 하루 허용량이
 * 10,000건이라 여유를 크게 둔다.
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

  const rawGroup = params.get('group');
  const group = MARKET_GROUPS.find((g) => g === rawGroup) as MarketGroup | undefined;
  if (!group) {
    return NextResponse.json({ message: '분류를 확인해주세요.' }, { status: 400 });
  }

  const channel: SalesChannel = params.get('channel') === 'wholesale' ? 'wholesale' : 'retail';

  const rawRegion = params.get('region');
  const region = rawRegion && MARKET_REGIONS.some((r) => r.code === rawRegion) ? rawRegion : null;

  try {
    const result = await fetchGroupPrices(group, channel, region, REVALIDATE_SECONDS);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=600`,
      },
    });
  } catch {
    return NextResponse.json(
      { message: '시세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 502 },
    );
  }
}
