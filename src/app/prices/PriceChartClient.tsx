'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatWon } from '@/lib/domain/money';

/**
 * 품목 하나의 기간별 가격 추이 그래프.
 *
 * 상세 페이지(/prices/[slug])에 박아 넣는 컴포넌트다. 서버가 미리 받아온 기간(보통
 * 1개월)은 즉시 보여주고, 다른 기간을 누르면 그때 /api/market-prices/history 를 부른다.
 * (기간이 길수록 조회량이 커지는 API 라 나머지 3개를 미리 다 받아두지 않는다)
 */

export type HistoryPeriod = '7d' | '1m' | '3m' | '1y';

const PERIODS: { value: HistoryPeriod; label: string }[] = [
  { value: '7d', label: '7일' },
  { value: '1m', label: '1개월' },
  { value: '3m', label: '3개월' },
  { value: '1y', label: '1년' },
];

export interface HistoryPoint {
  date: string;
  price: number;
  marketCount: number;
}

export interface HistoryPayload {
  unitLabel: string;
  variety: string;
  points: HistoryPoint[];
}

function formatDate(ymd: string): string {
  if (ymd.length !== 8) return ymd;
  return `${ymd.slice(2, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}
function formatMd(ymd: string): string {
  if (ymd.length !== 8) return ymd;
  return `${Number(ymd.slice(4, 6))}/${Number(ymd.slice(6, 8))}`;
}

function Chart({ points }: { points: HistoryPoint[] }) {
  // 좌우/위아래 여백을 둔 좌표계. viewBox 로 그려 화면 너비에 맞춰 늘어난다.
  const W = 320;
  const H = 150;
  const padL = 6;
  const padR = 6;
  const padT = 10;
  const padB = 6;

  const values = points.map((p) => p.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.05);
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xy = points.map((p, i) => {
    const x = padL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = padT + innerH - ((p.price - min) / span) * innerH;
    return { x, y, p };
  });

  const line = xy.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
  const area = `${line} L${xy[xy.length - 1].x.toFixed(1)},${(padT + innerH).toFixed(1)} L${xy[0].x.toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  const first = points[0];
  const last = points[points.length - 1];
  const rising = last.price >= first.price;
  const stroke = rising ? '#dc2626' : '#0284c7';

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs font-semibold text-ink-500">
        <span className="tnum">최고 {formatWon(max)}</span>
        <span className="tnum">최저 {formatWon(min)}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1.5 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${formatDate(first.date)} ${first.price}원부터 ${formatDate(last.date)} ${last.price}원까지 가격 추이`}
      >
        <path d={area} fill={stroke} fillOpacity="0.08" />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {xy.map((q) => (
          <circle key={q.p.date} cx={q.x} cy={q.y} r="2.5" fill={stroke} />
        ))}
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-xs text-ink-400">
        <span className="tnum">{formatDate(first.date)}</span>
        <span className="tnum">{formatDate(last.date)}</span>
      </div>

      {/* 그래프를 못 보는 경우(스크린리더 등)에도 값을 읽을 수 있게 표로 함께 제공한다. */}
      <table className="sr-only">
        <caption>조사일별 가격</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{formatDate(p.date)}</th>
              <td>{formatWon(p.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PriceChartClient({
  itemKey,
  variety,
  channel,
  region,
  initialPeriod,
  initialData,
}: {
  itemKey: string;
  variety?: string;
  channel: 'retail' | 'wholesale';
  region: string;
  initialPeriod: HistoryPeriod;
  /** 서버가 미리 받아온 값. null 이면 그 기간도 클릭해야 불러온다. */
  initialData: HistoryPayload | null;
}) {
  const [period, setPeriod] = useState<HistoryPeriod>(initialPeriod);
  const [cache, setCache] = useState<Record<HistoryPeriod, HistoryPayload | undefined>>(() => ({
    '7d': undefined,
    '1m': undefined,
    '3m': undefined,
    '1y': undefined,
    [initialPeriod]: initialData ?? undefined,
  }));
  const [errors, setErrors] = useState<Partial<Record<HistoryPeriod, string>>>({});
  const [pending, setPending] = useState(false);

  const data = cache[period];
  const error = errors[period];

  const load = (target: HistoryPeriod) => {
    if (cache[target] || pending) return;
    setPending(true);
    fetch(
      `/api/market-prices/history?key=${encodeURIComponent(itemKey)}&period=${target}&channel=${channel}${
        region ? `&region=${region}` : ''
      }${variety ? `&variety=${encodeURIComponent(variety)}` : ''}`,
    )
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.message ?? '가격 추이를 불러오지 못했습니다.');
        return body as HistoryPayload;
      })
      .then((payload) => {
        setCache((prev) => ({ ...prev, [target]: payload }));
      })
      .catch((err: unknown) => {
        setErrors((prev) => ({
          ...prev,
          [target]: err instanceof Error ? err.message : '가격 추이를 불러오지 못했습니다.',
        }));
      })
      .finally(() => setPending(false));
  };

  const selectPeriod = (target: HistoryPeriod) => {
    setPeriod(target);
    load(target);
  };

  const points = data?.points ?? [];
  const last = points[points.length - 1];
  const first = points[0];
  const change =
    first && last && first.price > 0
      ? Math.round(((last.price - first.price) / first.price) * 1000) / 10
      : null;

  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5" role="tablist">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={period === p.value}
            onClick={() => selectPeriod(p.value)}
            className={`h-9 rounded-lg text-sm font-bold transition-colors ${
              period === p.value ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {!data && !error ? (
          <div className="h-[13rem] animate-pulse rounded-xl bg-ink-100" />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-[15px] font-semibold text-ink-800">{error}</p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() =>
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next[period];
                  return next;
                })
              }
            >
              다시 시도
            </Button>
          </div>
        ) : points.length === 0 ? (
          <p className="py-10 text-center text-[15px] text-ink-500">이 기간에는 조사 자료가 없습니다.</p>
        ) : points.length === 1 ? (
          <div className="py-8 text-center">
            <p className="tnum text-2xl font-extrabold text-ink-900">{formatWon(points[0].price)}</p>
            <p className="mt-1 text-sm text-ink-500">
              {formatDate(points[0].date)} 조사 · 시장 {points[0].marketCount}곳 평균
            </p>
            <p className="mt-3 text-xs text-ink-400">이 기간에 조사일이 하나뿐이라 그래프를 그릴 수 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="tnum text-2xl font-extrabold text-ink-900">
                  {formatWon(last.price)}
                  <span className="ml-1 text-sm font-bold text-ink-500">/ {data?.unitLabel}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {formatDate(last.date)} 조사 · 시장 {last.marketCount}곳 평균
                </p>
              </div>
              {change !== null ? (
                <p
                  className={`tnum text-sm font-bold ${
                    change > 0 ? 'text-red-600' : change < 0 ? 'text-sky-600' : 'text-ink-500'
                  }`}
                >
                  {change > 0 ? '▲ +' : change < 0 ? '▼ ' : ''}
                  {change}%<span className="ml-1 font-medium text-ink-400">({formatMd(first.date)} 대비)</span>
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <Chart points={points} />
            </div>

            <p className="mt-4 break-keep text-xs leading-relaxed text-ink-400">
              조사 시장들의 단순 평균입니다. 3개월·1년은 기간 안에서 일정 간격으로 뽑은 조사일을 이어
              그린 것이라 모든 날짜가 표시되지는 않습니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
