'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SelectField, TextField } from '@/components/ui/Field';
import { IconArrowDown, IconArrowUp, IconSearch, IconStar } from '@/components/ui/Icons';
import { formatWon } from '@/lib/domain/money';
import { MARKET_GROUPS, MARKET_REGIONS } from '@/lib/market/catalog';
import { readFavorites, toggleFavorite } from './favorites';
import { PriceHistoryModal, type HistoryTarget } from './PriceHistoryModal';

/**
 * 농산물 시세 화면.
 *
 * 실제 데이터는 서버 라우트(/api/market-prices)가 공공데이터포털에서 받아온다.
 * 그 API 는 품목코드가 필수라 품목당 한 번씩 불러야 해서, 분류(채소/과일/…)별로 나눠
 * 받고 먼저 도착한 분류부터 화면에 채운다.
 */

type Channel = 'retail' | 'wholesale';
type Group = (typeof MARKET_GROUPS)[number];

interface PricePoint {
  date: string;
  price: number;
}

interface PriceRow {
  key: string;
  itemKey: string;
  name: string;
  emoji: string;
  group: Group;
  variety: string;
  grade: string;
  unitLabel: string;
  price: number;
  marketCount: number;
  date: string;
  prevPrice: number | null;
  prevDate: string | null;
  changeRate: number | null;
  trend: PricePoint[];
}

interface GroupPayload {
  rows: PriceRow[];
  latestDate: string | null;
}

/** 첫 화면에서 눈에 띄게 보여줄 대표 품목 (없으면 조용히 건너뛴다) */
const HIGHLIGHT_KEYS = ['200_245', '200_211', '200_246', '100_152', '500_4304', '500_9903'];

function formatYmd(ymd: string): string {
  if (ymd.length !== 8) return ymd;
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

/** 원가가 오르면 사장님에게 불리하므로 상승을 빨간색으로 본다. 색만으로 구분하지 않도록 기호·문구를 함께 쓴다. */
function ChangeText({ rate, className = '' }: { rate: number | null; className?: string }) {
  if (rate === null) return <span className={`text-xs text-ink-400 ${className}`}>비교 자료 없음</span>;
  if (rate === 0) return <span className={`tnum text-xs font-semibold text-ink-500 ${className}`}>변동 없음</span>;
  const up = rate > 0;
  const Icon = up ? IconArrowUp : IconArrowDown;
  return (
    <span
      className={`tnum inline-flex items-center gap-0.5 font-bold ${up ? 'text-red-600' : 'text-sky-600'} ${className}`}
    >
      <Icon width={13} height={13} strokeWidth={2.8} aria-hidden="true" />
      {up ? '+' : ''}
      {rate}%<span className="sr-only">{up ? ' 상승' : ' 하락'}</span>
    </span>
  );
}

/** 최근 조사일들의 가격 흐름을 아주 작게 보여준다. */
function Sparkline({ points, rate }: { points: PricePoint[]; rate: number | null }) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 56;
  const h = 20;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p.price - min) / span) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke = rate === null || rate === 0 ? '#94a3b8' : rate > 0 ? '#dc2626' : '#0284c7';
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 overflow-visible"
      role="img"
      aria-label={`최근 ${points.length}회 조사 가격 흐름`}
    >
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FavoriteButton({ favorited, onToggle, name }: { favorited: boolean; onToggle: () => void; name: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={favorited}
      aria-label={favorited ? `${name} 즐겨찾기 해제` : `${name} 즐겨찾기에 추가`}
      className="flex h-11 w-9 shrink-0 items-center justify-center text-ink-300 transition-colors hover:text-brand-400"
    >
      <IconStar
        width={19}
        height={19}
        strokeWidth={1.8}
        fill={favorited ? 'currentColor' : 'none'}
        className={favorited ? 'text-brand-500' : ''}
      />
    </button>
  );
}

function PriceRowItem({
  row,
  favorited,
  onToggleFavorite,
  onSelect,
}: {
  row: PriceRow;
  favorited: boolean;
  onToggleFavorite: () => void;
  onSelect: (target: HistoryTarget) => void;
}) {
  const detail = [row.variety, row.grade !== row.variety ? row.grade : null].filter(Boolean).join(' · ');

  return (
    <li className="flex items-center border-b border-ink-100 last:border-b-0">
      <FavoriteButton favorited={favorited} onToggle={onToggleFavorite} name={row.name} />
      <button
        type="button"
        onClick={() => onSelect({ itemKey: row.itemKey, name: row.name, emoji: row.emoji, variety: row.variety })}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-1 text-left transition-colors hover:bg-ink-50/70"
        aria-label={`${row.name} 가격 추이 보기`}
      >
        <span className="shrink-0 text-xl" aria-hidden="true">
          {row.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink-900">{row.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {detail}
            {/* 조사 시장 수는 좁은 화면에서 줄바꿈을 만들어 넓은 화면에서만 보여준다. */}
            <span className="hidden sm:inline"> · 시장 {row.marketCount}곳 평균</span>
          </p>
        </div>
        {/* 추이 그래프는 좁은 화면에서 가격 칸을 밀어내므로 숨긴다. */}
        <span className="hidden sm:block">
          <Sparkline points={row.trend} rate={row.changeRate} />
        </span>
        <div className="w-[6.5rem] shrink-0 text-right sm:w-[7.5rem]">
          <p className="tnum text-[15px] font-extrabold text-ink-900">
            {formatWon(row.price)}
            <span className="ml-0.5 block text-[11px] font-bold text-ink-500">/ {row.unitLabel}</span>
          </p>
          <ChangeText rate={row.changeRate} className="mt-0.5 text-xs" />
        </div>
      </button>
    </li>
  );
}

function HighlightCard({
  row,
  onSelect,
}: {
  row: PriceRow;
  onSelect: (target: HistoryTarget) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect({ itemKey: row.itemKey, name: row.name, emoji: row.emoji, variety: row.variety })}
      className="rounded-xl border border-ink-200 bg-white p-4 text-left transition-colors hover:border-brand-300"
      aria-label={`${row.name} 가격 추이 보기`}
    >
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink-700">
        <span aria-hidden="true">{row.emoji}</span>
        {row.name}
      </p>
      <p className="tnum mt-2 text-lg font-extrabold text-ink-900">{formatWon(row.price)}</p>
      <p className="text-[11px] font-semibold text-ink-500">/ {row.unitLabel}</p>
      <ChangeText rate={row.changeRate} className="mt-1.5 text-xs" />
    </button>
  );
}

function MoverList({
  title,
  rows,
  emptyText,
  onSelect,
}: {
  title: string;
  rows: PriceRow[];
  emptyText: string;
  onSelect: (target: HistoryTarget) => void;
}) {
  return (
    <Card>
      <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-400">{emptyText}</p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-ink-100">
          {rows.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => onSelect({ itemKey: row.itemKey, name: row.name, emoji: row.emoji, variety: row.variety })}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:text-brand-600"
                aria-label={`${row.name} 가격 추이 보기`}
              >
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink-800">
                  <span aria-hidden="true">{row.emoji}</span>
                  <span className="truncate">{row.name}</span>
                </span>
                <ChangeText rate={row.changeRate} className="shrink-0 text-sm" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-6 w-6 shrink-0 animate-pulse rounded bg-ink-100" />
      <div className="flex-1">
        <div className="h-3.5 w-24 animate-pulse rounded bg-ink-100" />
        <div className="mt-2 h-2.5 w-36 animate-pulse rounded bg-ink-50" />
      </div>
      <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-ink-100" />
    </div>
  );
}

export function MarketPricesClient() {
  const [channel, setChannel] = useState<Channel>('retail');
  const [region, setRegion] = useState('');
  const [activeGroup, setActiveGroup] = useState<Group | '전체'>('전체');
  const [query, setQuery] = useState('');

  /** 캐시 키: `${channel}|${region}|${group}` */
  const [loaded, setLoaded] = useState<Record<string, GroupPayload>>({});
  const [failedGroups, setFailedGroups] = useState<Record<string, string>>({});
  const [reloadToken, setReloadToken] = useState(0);
  /** 가격 추이를 보고 있는 품목 */
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);
  // localStorage 는 렌더 중에 읽어도 안전하다(effect 안에서 setState 하는 게 아니라
  // 초기값을 한 번 계산하는 것뿐이라 React 19 의 "effect 안 setState 금지" 와 무관하다).
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites());

  const handleToggleFavorite = (key: string) => {
    setFavorites((prev) => toggleFavorite(prev, key));
  };

  const scope = `${channel}|${region}`;

  useEffect(() => {
    let cancelled = false;

    const load = async (group: Group) => {
      const cacheKey = `${scope}|${group}`;
      // 이미 받았거나 실패한 분류는 건너뛴다. (재시도는 reloadToken 으로 다시 들어온다)
      if (loaded[cacheKey] || failedGroups[cacheKey]) return;
      try {
        const res = await fetch(
          `/api/market-prices?group=${encodeURIComponent(group)}&channel=${channel}${
            region ? `&region=${region}` : ''
          }`,
        );
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setFailedGroups((prev) => ({
            ...prev,
            [cacheKey]: body?.message ?? '시세를 불러오지 못했습니다.',
          }));
          return;
        }
        setLoaded((prev) => ({ ...prev, [cacheKey]: body as GroupPayload }));
      } catch {
        if (cancelled) return;
        setFailedGroups((prev) => ({ ...prev, [cacheKey]: '시세를 불러오지 못했습니다.' }));
      }
    };

    (async () => {
      // 보고 있는 분류를 먼저 띄우고, 나머지는 한꺼번에 받는다.
      // 하나씩 순서대로 기다리면 전체 시간이 분류별 시간의 "합"이 된다.
      // 서버 쪽에 요청 상한이 걸려 있으므로 한꺼번에 보내도 공공 API 에 무리가 가지 않는다.
      const first: Group = activeGroup === '전체' ? MARKET_GROUPS[0] : activeGroup;
      await load(first);
      if (cancelled) return;
      await Promise.all(MARKET_GROUPS.filter((g) => g !== first).map(load));
    })();

    return () => {
      cancelled = true;
    };
    // loaded/failedGroups 를 의존성에 넣으면 갱신될 때마다 다시 돌아 무한 반복이 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, activeGroup, reloadToken]);

  const allRows = useMemo(
    () =>
      MARKET_GROUPS.flatMap((g) => loaded[`${scope}|${g}`]?.rows ?? []),
    [loaded, scope],
  );

  const loadedCount = MARKET_GROUPS.filter((g) => loaded[`${scope}|${g}`]).length;
  const allLoaded = loadedCount === MARKET_GROUPS.length;
  const activeLoaded = activeGroup === '전체' ? allRows.length > 0 : Boolean(loaded[`${scope}|${activeGroup}`]);
  const activeError = activeGroup === '전체' ? null : (failedGroups[`${scope}|${activeGroup}`] ?? null);

  const visibleRows = useMemo(() => {
    const base = activeGroup === '전체' ? allRows : (loaded[`${scope}|${activeGroup}`]?.rows ?? []);
    const q = query.trim();
    if (!q) return base;
    return base.filter((r) => r.name.includes(q) || r.variety.includes(q));
  }, [activeGroup, allRows, loaded, scope, query]);

  const favoriteRows = useMemo(() => {
    if (favorites.length === 0) return [];
    const order = new Map(favorites.map((k, i) => [k, i]));
    return allRows.filter((r) => order.has(r.key)).sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
  }, [allRows, favorites]);

  const highlights = useMemo(
    () =>
      // 품종이 여러 개인 품목(돼지 등)은 그중 조사 시장이 가장 많은 것 하나만 보여준다.
      HIGHLIGHT_KEYS.map((k) => allRows.find((r) => r.itemKey === k)).filter(
        (r): r is PriceRow => Boolean(r),
      ),
    [allRows],
  );

  const withChange = useMemo(
    () => allRows.filter((r) => r.changeRate !== null && r.changeRate !== 0),
    [allRows],
  );
  const risers = useMemo(
    () => [...withChange].sort((a, b) => (b.changeRate ?? 0) - (a.changeRate ?? 0)).slice(0, 5),
    [withChange],
  );
  const fallers = useMemo(
    () => [...withChange].sort((a, b) => (a.changeRate ?? 0) - (b.changeRate ?? 0)).slice(0, 5),
    [withChange],
  );

  const latestDate = useMemo(
    () => allRows.reduce<string | null>((max, r) => (!max || r.date > max ? r.date : max), null),
    [allRows],
  );

  const retry = () => {
    setFailedGroups({});
    setReloadToken((v) => v + 1);
  };

  const tabs: (Group | '전체')[] = ['전체', ...MARKET_GROUPS];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            농산물 시세
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-600">오늘의 식재료 가격을 한눈에 확인하세요.</p>
        </div>
        {latestDate ? (
          <p className="tnum text-sm font-semibold text-ink-500">{formatYmd(latestDate)} 조사</p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <SelectField
          label="지역"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          fieldClassName="w-[9rem]"
        >
          <option value="">전국</option>
          {MARKET_REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="가격 기준"
          value={channel}
          onChange={(e) => setChannel(e.target.value as Channel)}
          fieldClassName="w-[9rem]"
        >
          <option value="retail">소매가격</option>
          <option value="wholesale">도매가격</option>
        </SelectField>
      </div>
      <p className="mt-2 text-xs text-ink-500">
        {channel === 'retail'
          ? '소매가는 소비자가 사는 가격이라 실제 납품가보다 높을 수 있습니다.'
          : '도매가는 대량 구매 단위(예: 20kg) 기준입니다.'}
      </p>

      {/* 즐겨찾기 */}
      {favoriteRows.length > 0 ? (
        <section className="mt-7">
          <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold text-ink-900">
            <IconStar width={16} height={16} fill="currentColor" className="text-brand-500" aria-hidden="true" />
            즐겨찾기
          </h2>
          <Card padded={false} className="mt-3 overflow-hidden">
            <ul className="px-4 sm:px-5">
              {favoriteRows.map((row) => (
                <PriceRowItem
                  key={row.key}
                  row={row}
                  favorited
                  onToggleFavorite={() => handleToggleFavorite(row.key)}
                  onSelect={setHistoryTarget}
                />
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {/* 오늘의 주요 시세 */}
      {highlights.length > 0 ? (
        <section className="mt-7">
          <h2 className="text-[15px] font-extrabold text-ink-900">오늘의 주요 시세</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {highlights.map((row) => (
              <HighlightCard key={row.key} row={row} onSelect={setHistoryTarget} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 오른/내린 품목 */}
      {withChange.length > 0 ? (
        <section className="mt-7 grid gap-4 sm:grid-cols-2">
          <MoverList title="📈 가격이 오른 품목" rows={risers} emptyText="오른 품목이 없습니다." onSelect={setHistoryTarget} />
          <MoverList title="📉 가격이 내려간 품목" rows={fallers} emptyText="내려간 품목이 없습니다." onSelect={setHistoryTarget} />
        </section>
      ) : null}

      {/* 분류 탭 + 검색 */}
      <section className="mt-8">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveGroup(tab)}
                aria-pressed={activeGroup === tab}
                className={`h-9 shrink-0 whitespace-nowrap rounded-lg px-3.5 text-sm font-bold transition-colors ${
                  activeGroup === tab
                    ? 'bg-brand-500 text-white'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <TextField
            label=""
            placeholder="품목 검색 (예: 양파, 돼지)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            suffix=""
            aria-label="품목 검색"
          />
        </div>

        {!allLoaded ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ink-400">
            <IconSearch width={13} height={13} aria-hidden="true" />
            시세를 불러오는 중입니다… ({loadedCount}/{MARKET_GROUPS.length} 분류)
          </p>
        ) : null}

        <Card padded={false} className="mt-3 overflow-hidden">
          <div className="px-4 sm:px-5">
            {activeError && visibleRows.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[15px] font-semibold text-ink-800">{activeError}</p>
                <p className="mt-1 text-sm text-ink-500">
                  시세는 참고 정보이며, 원가 계산 기능은 그대로 사용할 수 있습니다.
                </p>
                <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button onClick={retry}>다시 시도</Button>
                  <Link href="/calculator" className={buttonClass('secondary', 'md')}>
                    원가 계산하기
                  </Link>
                </div>
              </div>
            ) : !activeLoaded ? (
              <div className="divide-y divide-ink-100">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            ) : visibleRows.length === 0 ? (
              <p className="py-10 text-center text-[15px] text-ink-500">
                {query ? `"${query}" 에 해당하는 품목이 없습니다.` : '표시할 시세 자료가 없습니다.'}
              </p>
            ) : (
              <ul>
                {visibleRows.map((row) => (
                  <PriceRowItem
                    key={row.key}
                    row={row}
                    favorited={favorites.includes(row.key)}
                    onToggleFavorite={() => handleToggleFavorite(row.key)}
                    onSelect={setHistoryTarget}
                  />
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>

      <Card className="mt-7 bg-brand-50/50">
        <h2 className="text-[15px] font-bold text-ink-900">내 재료 원가와 비교해보세요</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
          위 시세와 내 재료에 저장한 구매가격을 비교하면 지금 사고 있는 가격이 적절한지 판단하는 데
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

      <p className="mt-6 break-keep text-xs leading-relaxed text-ink-400">
        자료: 한국농수산식품유통공사(aT) 농산물유통정보(KAMIS) 일별 도·소매 가격정보, 공공데이터포털
        제공. 조사 시장들의 단순 평균이며 품목별로 조사일이 다를 수 있습니다. 같은 품목 안에서도
        품종·등급에 따라 가격이 크게 다르므로 대표 품종 하나를 기준으로 보여줍니다. 지역·거래처에 따라
        실제 구매가격과 차이가 날 수 있어 참고용으로만 사용해주세요.
      </p>

      <PriceHistoryModal
        target={historyTarget}
        channel={channel}
        region={region}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}
