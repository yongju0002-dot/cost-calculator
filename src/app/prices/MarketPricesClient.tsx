'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconArrowDown, IconArrowUp } from '@/components/ui/Icons';
import { formatWon } from '@/lib/domain/money';

/**
 * 농산물 시세 화면.
 *
 * 실제 데이터는 서버 라우트(/api/market-prices)가 공공데이터포털에서 받아온다.
 * (인증키가 브라우저에 노출되면 안 되고, 그 API 는 브라우저에서 직접 호출할 수도 없다)
 */

type Channel = 'retail' | 'wholesale';

interface PriceRow {
  key: string;
  label: string;
  group: string;
  variety: string;
  grade: string;
  unitLabel: string;
  price: number;
  marketCount: number;
  date: string;
  prevPrice: number | null;
  prevDate: string | null;
  changeRate: number | null;
}

interface PricesPayload {
  rows: PriceRow[];
  latestDate: string | null;
}

const CHANNEL_LABEL: Record<Channel, string> = { retail: '소매', wholesale: '도매' };

function formatYmd(ymd: string): string {
  if (ymd.length !== 8) return ymd;
  return `${Number(ymd.slice(4, 6))}월 ${Number(ymd.slice(6, 8))}일`;
}

/** 원가가 오르면 사장님에게 불리하므로 상승을 빨간색으로 본다. 색만으로 구분하지 않도록 기호·문구를 함께 쓴다. */
function ChangeBadge({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="text-sm text-ink-400">비교 자료 없음</span>;
  }
  if (rate === 0) {
    return <span className="tnum text-sm font-semibold text-ink-500">변동 없음</span>;
  }
  const up = rate > 0;
  const Icon = up ? IconArrowUp : IconArrowDown;
  return (
    <span
      className={`tnum inline-flex items-center gap-0.5 text-sm font-bold ${
        up ? 'text-red-600' : 'text-sky-600'
      }`}
    >
      <Icon width={14} height={14} strokeWidth={2.6} aria-hidden="true" />
      {up ? '+' : ''}
      {rate}%<span className="sr-only">{up ? ' 상승' : ' 하락'}</span>
    </span>
  );
}

function PriceRowItem({ row }: { row: PriceRow }) {
  // 등급명이 품종명과 같은 경우가 있어(닭 → 육계(kg)) 중복 표기를 피한다.
  const detail = [row.variety, row.grade !== row.variety ? row.grade : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink-100 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-ink-900">{row.label}</p>
        <p className="mt-0.5 break-keep text-xs leading-relaxed text-ink-500">
          {detail} · {formatYmd(row.date)} 조사 · 시장 {row.marketCount}곳 평균
        </p>
      </div>
      <div className="text-right">
        <p className="tnum text-[17px] font-extrabold text-ink-900">
          {formatWon(row.price)}
          <span className="ml-1 text-xs font-bold text-ink-500">/ {row.unitLabel}</span>
        </p>
        <p className="mt-0.5">
          <ChangeBadge rate={row.changeRate} />
          {row.prevDate ? (
            <span className="ml-1 text-xs text-ink-400">({formatYmd(row.prevDate)} 대비)</span>
          ) : null}
        </p>
      </div>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((block) => (
        <Card key={block}>
          <div className="h-4 w-24 animate-pulse rounded bg-ink-100" />
          <div className="mt-4 flex flex-col gap-4">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="h-3.5 w-20 animate-pulse rounded bg-ink-100" />
                  <div className="mt-2 h-2.5 w-40 animate-pulse rounded bg-ink-50" />
                </div>
                <div className="h-4 w-24 animate-pulse rounded bg-ink-100" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function MarketPricesClient() {
  const [channel, setChannel] = useState<Channel>('retail');
  // 탭을 왔다 갔다 해도 다시 받아오지 않도록 채널별로 보관한다.
  const [cache, setCache] = useState<Partial<Record<Channel, PricesPayload>>>({});
  const [errors, setErrors] = useState<Partial<Record<Channel, string>>>({});
  /** 다시 시도 버튼을 누르면 값을 바꿔 조회를 한 번 더 실행시킨다. */
  const [reloadToken, setReloadToken] = useState(0);

  const data = cache[channel];
  const error = errors[channel] ?? null;
  // 결과도 오류도 아직 없으면 불러오는 중이다.
  // (effect 안에서 setState 를 바로 호출하면 렌더가 연쇄되어 React 19 에서 막는다)
  const loading = !data && !error;

  useEffect(() => {
    if (cache[channel] || errors[channel]) return;
    let cancelled = false;

    fetch(`/api/market-prices?channel=${channel}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.message ?? '시세를 불러오지 못했습니다.');
        return body as PricesPayload;
      })
      .then((payload) => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [channel]: payload }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrors((prev) => ({
          ...prev,
          [channel]: err instanceof Error ? err.message : '시세를 불러오지 못했습니다.',
        }));
      });

    return () => {
      cancelled = true;
    };
    // cache/errors 를 의존성에 넣으면 갱신될 때마다 다시 실행된다. 채널과 재시도 신호만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, reloadToken]);

  const retry = () => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[channel];
      return next;
    });
    setReloadToken((v) => v + 1);
  };

  const groups = data ? [...new Set(data.rows.map((r) => r.group))] : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          농산물 시세
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
          주요 식자재의 최근 조사 가격입니다. 재료 구매가격을 정하거나 원가가 왜 올랐는지 확인할 때
          참고하세요.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 rounded-xl bg-ink-100 p-1" role="tablist">
        {(['retail', 'wholesale'] as Channel[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={channel === value}
            onClick={() => setChannel(value)}
            className={`h-10 rounded-lg text-sm font-bold transition-colors ${
              channel === value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'
            }`}
          >
            {CHANNEL_LABEL[value]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-500">
        {channel === 'retail'
          ? '소매가는 소비자가 사는 가격이라 실제 납품가보다 높을 수 있습니다.'
          : '도매가는 대량 구매 단위(예: 20kg) 기준입니다.'}
      </p>

      <div className="mt-6">
        {loading && !data ? <LoadingState /> : null}

        {error && !data ? (
          <Card className="text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl">
              ⚠️
            </span>
            <p className="text-[15px] font-semibold text-ink-800">{error}</p>
            <p className="mt-1 text-sm text-ink-500">
              시세는 참고 정보이며, 원가 계산 기능은 그대로 사용할 수 있습니다.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button onClick={retry}>다시 시도</Button>
              <Link href="/calculator" className={buttonClass('secondary', 'md')}>
                원가 계산하기
              </Link>
            </div>
          </Card>
        ) : null}

        {data && data.rows.length === 0 ? (
          <Card className="text-center">
            <p className="text-[15px] font-semibold text-ink-800">
              표시할 시세 자료가 없습니다.
            </p>
            <p className="mt-1 text-sm text-ink-500">
              조사 자료가 아직 올라오지 않았을 수 있습니다. 잠시 후 다시 확인해주세요.
            </p>
          </Card>
        ) : null}

        {data && data.rows.length > 0 ? (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <Card key={group} padded={false} className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-5 py-3">
                  <h2 className="text-sm font-extrabold text-ink-800">{group}</h2>
                  <Badge tone="neutral">{CHANNEL_LABEL[channel]}</Badge>
                </div>
                <ul className="px-5">
                  {data.rows
                    .filter((row) => row.group === group)
                    .map((row) => (
                      <PriceRowItem key={row.key} row={row} />
                    ))}
                </ul>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

      {data && data.rows.length > 0 ? (
        <Card className="mt-6 bg-brand-50/50">
          <h2 className="text-[15px] font-bold text-ink-900">내 재료 원가와 비교해보세요</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
            내 재료에 저장한 구매가격과 위 시세를 비교하면 지금 사고 있는 가격이 적절한지 판단하는 데
            도움이 됩니다.
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
      ) : null}

      <p className="mt-6 break-keep text-xs leading-relaxed text-ink-400">
        자료: 한국농수산식품유통공사(aT) 일별 도·소매 가격정보, 공공데이터포털 제공. 조사 시장들의
        단순 평균이며 품목별로 조사일이 다를 수 있습니다. 지역·거래처·등급에 따라 실제 구매가격과 차이가
        날 수 있어 참고용으로만 사용해주세요.
      </p>
    </div>
  );
}
