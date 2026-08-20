import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatPercent, formatWon } from '@/lib/domain/money';
import { fetchGroupPrices, fetchItemHistory, isMarketApiConfigured, type MarketPriceRow } from '@/lib/market/agromarket';
import { cachedValue } from '@/lib/market/cache';
import { CATALOG } from '@/lib/market/catalog';
import { findItemBySlug, itemSlug } from '@/lib/market/slug';
import { JsonLd, SITE_URL } from '@/lib/seo';
import { PriceChartClient, type HistoryPayload } from '../PriceChartClient';

/**
 * 품목 하나짜리 시세 페이지 (예: /prices/양파-200_245).
 *
 * "매일 갱신되는 시세 정보"는 검색 유입에 유리한 콘텐츠라 품목마다 색인 가능한
 * 페이지를 따로 둔다. /prices(목록)는 전부 클라이언트에서 fetch 하는 화면이라
 * 크롤러가 처음 받는 HTML 에는 가격이 비어 있었는데, 이 페이지는 서버에서 미리
 * 데이터를 채워 넣으므로 뷰소스만으로도 실제 가격이 보인다.
 */

// 6시간마다 다시 만든다. 시세 자체가 하루 1회 갱신되는 자료다.
export const revalidate = 21600;
const REVALIDATE_SECONDS = 21600;

/** generateStaticParams 로 만든 슬러그가 아니면 그냥 404. 오타·구버전 링크가 별도
 * URL 로 색인되는 걸 막는다. */
export const dynamicParams = false;

export function generateStaticParams() {
  return CATALOG.map((item) => ({ slug: itemSlug(item) }));
}

/** /prices 목록 라우트와 정확히 같은 캐시를 쓴다 (서버 시작 시 미리 채워둔 값을 그대로 재사용). */
async function loadGroupRows(item: (typeof CATALOG)[number], channel: 'retail' | 'wholesale') {
  return cachedValue(`prices|${item.group}|${channel}|`, REVALIDATE_SECONDS * 1000, () =>
    fetchGroupPrices(item.group, channel, null, REVALIDATE_SECONDS),
  );
}

function defaultChannel(item: (typeof CATALOG)[number]): 'retail' | 'wholesale' {
  return item.retail ? 'retail' : 'wholesale';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = findItemBySlug(decodeURIComponent(slug));
  if (!item) return {};

  const url = `/prices/${itemSlug(item)}`;
  if (!isMarketApiConfigured()) {
    return {
      title: `${item.name} 시세`,
      alternates: { canonical: url },
    };
  }

  const channel = defaultChannel(item);
  const result = await loadGroupRows(item, channel).catch(() => null);
  const row = result?.rows.find((r) => r.itemKey === item.key);

  const channelLabel = channel === 'retail' ? '소매' : '도매';
  const title = row
    ? `${item.name} 시세 - 오늘 ${channelLabel} ${formatWon(row.price)}/${row.unitLabel}`
    : `${item.name} 시세 - 도매·소매 가격`;
  const changeText =
    row?.changeRate != null
      ? row.changeRate > 0
        ? ` 지난주 대비 ${formatPercent(row.changeRate)} 상승했습니다.`
        : row.changeRate < 0
          ? ` 지난주 대비 ${formatPercent(Math.abs(row.changeRate))} 하락했습니다.`
          : ' 지난주와 가격 변동이 없습니다.'
      : '';
  const description = row
    ? `${item.name} 오늘 ${channelLabel}가는 ${formatWon(row.price)}/${row.unitLabel}입니다.${changeText} 한국농수산식품유통공사 조사 자료 기준, 매일 갱신됩니다.`
    : `${item.name}의 도매·소매 가격과 지난주 대비 변동률을 확인하세요. 한국농수산식품유통공사 조사 자료 기준입니다.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

function ChangeBadge({ rate }: { rate: number | null }) {
  if (rate === null) return null;
  if (rate === 0) return <Badge tone="neutral">변동 없음</Badge>;
  const up = rate > 0;
  return (
    <Badge tone={up ? 'danger' : 'info'}>
      {up ? '▲' : '▼'} {formatPercent(Math.abs(rate))} {up ? '상승' : '하락'}
    </Badge>
  );
}

function PriceCard({ row, channelLabel }: { row: MarketPriceRow; channelLabel: string }) {
  return (
    <Card>
      <p className="text-xs font-bold text-ink-400">{channelLabel} · 오늘 시세</p>
      <div className="mt-1.5 flex flex-wrap items-end justify-between gap-3">
        <p className="tnum text-3xl font-extrabold text-ink-900">
          {formatWon(row.price)}
          <span className="ml-1.5 text-base font-bold text-ink-500">/ {row.unitLabel}</span>
        </p>
        <ChangeBadge rate={row.changeRate} />
      </div>
      <p className="mt-2 text-sm text-ink-500">
        {row.variety}
        {row.grade !== row.variety ? ` · ${row.grade}` : ''} · 시장 {row.marketCount}곳 평균
      </p>
    </Card>
  );
}

export default async function ItemPricePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findItemBySlug(decodeURIComponent(slug));
  if (!item) notFound();

  if (!isMarketApiConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-ink-900">
          {item.emoji} {item.name} 시세
        </h1>
        <p className="mt-3 text-[15px] text-ink-500">시세 기능이 아직 준비되지 않았습니다.</p>
        <Link href="/prices" className={buttonClass('secondary', 'md', 'mt-6')}>
          시세 전체보기
        </Link>
      </div>
    );
  }

  const channel = defaultChannel(item);
  const channelLabel = channel === 'retail' ? '소매' : '도매';

  const [groupResult, historyResult] = await Promise.all([
    loadGroupRows(item, channel).catch(() => null),
    fetchItemHistory(item, channel, null, '1m', REVALIDATE_SECONDS).catch(() => null),
  ]);

  const rows = (groupResult?.rows ?? []).filter((r) => r.itemKey === item.key);
  const mainRow = rows[0] ?? null;
  const otherRows = rows.slice(1);

  const initialHistory: HistoryPayload | null =
    historyResult && historyResult.points.length > 0
      ? { unitLabel: historyResult.unitLabel, variety: historyResult.variety, points: historyResult.points }
      : null;

  const productJsonLd = mainRow
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.name,
        category: item.group,
        offers: {
          '@type': 'Offer',
          price: mainRow.price,
          priceCurrency: 'KRW',
          url: `${SITE_URL}/prices/${itemSlug(item)}`,
          availability: 'https://schema.org/InStock',
        },
      }
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      {productJsonLd ? <JsonLd data={productJsonLd} /> : null}

      <nav className="text-sm text-ink-500">
        <Link href="/prices" className="font-semibold text-brand-600 hover:underline">
          농산물 시세
        </Link>
        <span className="mx-1.5">/</span>
        <span>{item.group}</span>
      </nav>

      <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
        <span aria-hidden="true">{item.emoji}</span>
        {item.name} 시세
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-600">
        {item.name}의 오늘 {channelLabel} 가격과 최근 추이를 확인하세요.
      </p>

      <div className="mt-6">
        {mainRow ? (
          <PriceCard row={mainRow} channelLabel={channelLabel} />
        ) : (
          <Card className="text-center text-[15px] text-ink-500">
            지금은 표시할 시세 자료가 없습니다. 잠시 후 다시 확인해주세요.
          </Card>
        )}
      </div>

      {otherRows.length > 0 ? (
        <Card className="mt-4">
          <CardTitle>품종별 가격</CardTitle>
          <ul className="flex flex-col divide-y divide-ink-100">
            {otherRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                <span className="font-semibold text-ink-800">{row.variety}</span>
                <span className="tnum font-bold text-ink-900">
                  {formatWon(row.price)}
                  <span className="ml-1 text-xs font-semibold text-ink-500">/ {row.unitLabel}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardTitle>가격 추이</CardTitle>
        <PriceChartClient
          itemKey={item.key}
          variety={mainRow?.variety}
          channel={channel}
          region=""
          initialPeriod="1m"
          initialData={initialHistory}
        />
      </Card>

      <Card className="mt-4 bg-brand-50/50">
        <h2 className="text-[15px] font-bold text-ink-900">내 재료 원가와 비교해보세요</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
          {item.name}을(를) 재료로 등록해 두면 이 시세와 내 구매가격을 비교하고, 메뉴 원가에도 바로
          반영할 수 있습니다.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/ingredients" className={buttonClass('primary', 'md', 'w-full sm:w-auto')}>
            내 재료 보기
          </Link>
          <Link href="/calculator" className={buttonClass('secondary', 'md', 'w-full sm:w-auto')}>
            원가 계산하기
          </Link>
        </div>
      </Card>

      <Link href="/prices" className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:underline">
        ← 농산물 시세 전체보기
      </Link>

      <p className="mt-6 break-keep text-xs leading-relaxed text-ink-400">
        자료: 한국농수산식품유통공사(aT) 농산물유통정보(KAMIS) 일별 도·소매 가격정보, 공공데이터포털
        제공. 조사 시장들의 단순 평균이며, 지역·거래처에 따라 실제 구매가격과 차이가 날 수 있어
        참고용으로만 사용해주세요.
      </p>
    </div>
  );
}
