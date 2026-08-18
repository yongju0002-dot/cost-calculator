import 'server-only';
import { CATALOG, type CatalogItem, type MarketGroup } from './catalog';

/**
 * 농산물 시세 (한국농수산식품유통공사 일별 도·소매 가격정보).
 *
 * 공공데이터포털: https://www.data.go.kr/data/15156057/openapi.do
 * 엔드포인트: https://apis.data.go.kr/B552845/perDay/price
 *
 * 서버에서만 호출한다. 인증키(DATA_GO_KR_SERVICE_KEY)는 브라우저에 노출되면 안 되고,
 * 이 API 는 브라우저에서 직접 부를 수도 없다(CORS). /api/market-prices 라우트가 대신 호출한다.
 *
 * ── 실제로 호출해서 확인한 API 동작 (추측 아님) ──
 *  - 조회 조건은 `cond[필드::연산자]` 형식이다. 예) cond[exmn_ymd::GTE]=20260801
 *    startDate 같은 흔한 이름은 오류 없이 조용히 무시되고 0건이 온다.
 *  - 부류코드(ctgry_cd)와 품목코드(item_cd)가 모두 필수다. 부류코드만 줘도 0건이 온다.
 *    → 품목 하나당 한 번씩 불러야 한다. 한 번에 여러 품목을 받을 수 없다.
 *  - numOfRows 상한은 1000. 결과는 조사일 오름차순이라 최신값은 마지막 페이지에 있다.
 *  - **요청을 몰아치면 HTTP 429 로 막힌다.** 동시 8개씩 쉬지 않고 던졌을 때 374건 중 155건이
 *    429 였다. 동시 5개 + 배치 사이 150ms 지연이면 문제가 없었다. 그래서 아래 requestQueue 로
 *    전체 상한을 걸어둔다 (라우트가 동시에 여러 번 호출돼도 상한이 유지된다).
 *  - kg환산가격(exmn_dd_cnvs_prc)은 축산물에서 값이 어긋난다(돼지·소가 똑같이 29300).
 *    그래서 조사일가격(exmn_dd_prc) + 단위(unit, unit_sz)를 쓴다.
 *  - 한 품목에 품종·등급·단위가 여러 개 섞여 있고(돼지 → 삼겹살/앞다리/갈비/목심, 소는 15가지),
 *    품종명이 조사일마다 바뀌기도 한다(닭 → 육계12호/육계(kg)). 그래서 품종·등급·단위별로
 *    묶고, 가격 비교도 같은 묶음 안에서만 한다.
 */

const ENDPOINT = 'https://apis.data.go.kr/B552845/perDay/price';
const MAX_ROWS = 1000;
/** 조회 기간(일). 시세·변동률·최근 추이를 이 한 번의 조회로 모두 만든다. */
const WINDOW_DAYS = 9;

export const SALES_CHANNELS = { retail: '01', wholesale: '02' } as const;
export type SalesChannel = keyof typeof SALES_CHANNELS;

interface RawItem {
  exmn_ymd: string;
  se_nm: string;
  item_nm: string;
  vrty_nm: string;
  grd_nm: string;
  sgg_cd: string;
  sgg_nm: string;
  unit: string;
  unit_sz: string;
  mrkt_nm: string;
  /** 조사일가격 (단위 = unit_sz + unit) */
  exmn_dd_prc: string;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface MarketPriceRow {
  /** 화면 렌더링용 고유 키. 품종이 여러 개인 품목은 품종별로 다르다. */
  key: string;
  /** 카탈로그 원본 키(=품목 단위). 가격 추이 조회 등 "이 품목"을 가리킬 때 쓴다. */
  itemKey: string;
  name: string;
  emoji: string;
  group: MarketGroup;
  /** 품종명 (예: 삼겹살, 여름(고랭지)) */
  variety: string;
  /** 등급명 (예: 상품, 1++등급) — 같은 품종·단위 안에서 가장 많이 보고된 등급 */
  grade: string;
  /** 가격 기준 단위 (예: 1kg, 100g, 1포기) */
  unitLabel: string;
  /** 조사 시장 평균 가격 (원) */
  price: number;
  marketCount: number;
  /** 조사일자 (YYYYMMDD) */
  date: string;
  prevPrice: number | null;
  prevDate: string | null;
  /** 비교 시점 대비 변동률 (%) */
  changeRate: number | null;
  /** 최근 추이 (조사일 오름차순, 최대 8개) */
  trend: PricePoint[];
}

export interface MarketPricesResult {
  channel: SalesChannel;
  group: MarketGroup;
  region: string | null;
  rows: MarketPriceRow[];
  latestDate: string | null;
}

function serviceKey(): string {
  return (process.env.DATA_GO_KR_SERVICE_KEY ?? '').trim();
}

export const isMarketApiConfigured = (): boolean => serviceKey().length > 0;

/** 오늘부터 daysAgo 일 전 날짜 (한국 시간 기준) */
function daysAgoYmd(daysAgo: number): string {
  // 서버 시간대가 UTC 여도 한국 날짜가 나오도록 +9시간 보정한 뒤 계산한다.
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() - daysAgo);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// ─────────────────────────────────────────────
// 요청 상한 (429 방지)
// ─────────────────────────────────────────────

/**
 * 동시에 열어둘 요청 수와 요청 사이 최소 간격.
 *
 * 실제로 측정해 정한 값이다.
 *  - 429 는 "초당 요청 수"에서 걸린다. 동시 5개 + 150ms 간격(≈초당 19건)까지는 429 가
 *    전혀 없었고, 간격 없이 몰아쳤을 때만 막혔다. 그래서 간격(GAP_MS)으로 초당 건수를
 *    묶어두고, 동시 실행 수는 넉넉하게 준다.
 *  - 이 API 는 건당 응답 시간이 200ms ~ 2.6초로 불규칙하다(같은 조건에서도 매번 다르다).
 *    동시 실행 수가 작으면 느린 요청 하나에 전체가 발목을 잡히므로 넉넉히 열어
 *    느린 요청들이 서로 겹치게 한다.
 */
const MAX_IN_FLIGHT = 24;
const GAP_MS = 50;

let inFlight = 0;
const waiting: (() => void)[] = [];
/** 다음 요청을 보낼 수 있는 가장 이른 시각 */
let nextSlotAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 공공 API 호출을 전역에서 제한한다.
 * 라우트가 분류별로 동시에 여러 번 호출돼도 실제 외부 요청은 이 상한을 넘지 않는다.
 *
 * 순서가 중요하다. 간격 대기를 먼저 하고 그 다음에 동시실행 슬롯을 잡는다.
 * 슬롯을 잡은 채로 기다리면 기다리는 동안 슬롯이 놀아서, 동시 실행 수를 늘려도
 * 처리량이 "1건당 GAP_MS" 로 묶여 버린다. (이 때문에 처음엔 초당 8건밖에 못 냈다)
 */
async function acquire(): Promise<void> {
  const now = Date.now();
  const startAt = Math.max(now, nextSlotAt);
  nextSlotAt = startAt + GAP_MS;
  if (startAt > now) await sleep(startAt - now);

  while (inFlight >= MAX_IN_FLIGHT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  inFlight += 1;
}

function release(): void {
  inFlight -= 1;
  waiting.shift()?.();
}

// ─────────────────────────────────────────────
// 조회
// ─────────────────────────────────────────────

interface ApiBody {
  /** 결과가 없을 때 빈 문자열로 오는 경우가 있다. */
  items?: { item?: RawItem[] } | '';
  totalCount?: number;
}

interface ApiResponse {
  response?: { header?: { resultCode?: string; resultMsg?: string }; body?: ApiBody };
}

function readItems(body: ApiBody): RawItem[] {
  const items = body.items;
  if (!items || typeof items === 'string') return [];
  return items.item ?? [];
}

function buildUrl(cfg: CatalogItem, se: string, from: string, to: string, pageNo: number): string {
  // URLSearchParams 가 값을 자동 인코딩하므로 인증키는 "디코딩된" 값을 넣어야 한다.
  const q = new URLSearchParams({
    serviceKey: serviceKey(),
    pageNo: String(pageNo),
    numOfRows: String(MAX_ROWS),
    returnType: 'json',
    'cond[exmn_ymd::GTE]': from,
    'cond[exmn_ymd::LTE]': to,
    'cond[se_cd::EQ]': se,
    'cond[ctgry_cd::EQ]': cfg.ctgry,
    'cond[item_cd::EQ]': cfg.item,
  });
  return `${ENDPOINT}?${q.toString()}`;
}

/** 429·5xx 는 잠시 쉬고 다시 시도한다. */
async function fetchPage(
  cfg: CatalogItem,
  se: string,
  from: string,
  to: string,
  pageNo: number,
  revalidate: number,
  attempt = 0,
): Promise<{ rows: RawItem[]; total: number }> {
  await acquire();
  let res: Response;
  try {
    res = await fetch(buildUrl(cfg, se, from, to, pageNo), { next: { revalidate } });
  } finally {
    release();
  }

  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await sleep(600 * 2 ** attempt);
    return fetchPage(cfg, se, from, to, pageNo, revalidate, attempt + 1);
  }
  if (!res.ok) throw new Error(`시세 API 오류 (${res.status})`);

  const json = (await res.json()) as ApiResponse;
  const code = json.response?.header?.resultCode;
  if (code && code !== '0' && code !== '00') {
    throw new Error(json.response?.header?.resultMsg || '시세 API 오류');
  }
  const body = json.response?.body;
  if (!body) return { rows: [], total: 0 };
  return { rows: readItems(body), total: body.totalCount ?? 0 };
}

/**
 * 품목 하나의 기간 데이터.
 *
 * 결과가 조사일 오름차순이고 1000건 상한이 있어, 1000건을 넘으면 뒤쪽 페이지도 받아
 * 최신 조사일이 빠지지 않게 한다. (소·풋고추·사과 등 6개 품목이 여기에 해당)
 */
async function fetchWindow(
  cfg: CatalogItem,
  se: string,
  from: string,
  to: string,
  revalidate: number,
): Promise<RawItem[]> {
  const first = await fetchPage(cfg, se, from, to, 1, revalidate);
  const lastPage = Math.ceil(first.total / MAX_ROWS);
  if (lastPage <= 1) return first.rows;

  const pages = [lastPage, lastPage - 1].filter((p) => p > 1);
  const rest = await Promise.all(
    pages.map((p) => fetchPage(cfg, se, from, to, p, revalidate).then((r) => r.rows)),
  );
  return [...first.rows, ...rest.flat()];
}

// ─────────────────────────────────────────────
// 집계
// ─────────────────────────────────────────────

interface Group {
  variety: string;
  /** 이 그룹에서 가장 많이 보고된 등급 (표시용) */
  grade: string;
  unitLabel: string;
  /** 조사일자 → 그 날 각 시장의 가격들 */
  byDate: Map<string, number[]>;
  /** 등급별 보고 횟수 (대표 등급을 정하는 데만 쓴다) */
  gradeCounts: Map<string, number>;
}

/**
 * 품종·단위별로, 다시 조사일별로 묶는다.
 *
 * 등급(grd_nm)은 묶는 기준에서 뺐다. 등급은 같은 품종의 품질 등급이라 "삼겹살 1등급"과
 * "삼겹살 상품"을 화면에서 굳이 나누지 않고 하나로 합쳐 보여준다. 대신 그 안에서 가장 많이
 * 보고된 등급을 대표로 표시한다. (품종은 화면에 별도 줄로 보여줄 만큼 다른 상품이지만,
 * 등급 차이까지 전부 줄로 쪼개면 소(쇠고기) 같은 품목이 지나치게 길어진다)
 */
function groupRows(rows: RawItem[], region: string | null): Group[] {
  const groups = new Map<string, Group>();
  for (const row of rows) {
    if (region && row.sgg_cd !== region) continue;
    const price = Number(row.exmn_dd_prc);
    if (!Number.isFinite(price) || price <= 0) continue;
    const unitLabel = `${row.unit_sz}${row.unit}`;
    const key = `${row.vrty_nm}|${unitLabel}`;
    let group = groups.get(key);
    if (!group) {
      group = { variety: row.vrty_nm, grade: row.grd_nm, unitLabel, byDate: new Map(), gradeCounts: new Map() };
      groups.set(key, group);
    }
    const list = group.byDate.get(row.exmn_ymd);
    if (list) list.push(price);
    else group.byDate.set(row.exmn_ymd, [price]);

    const gc = group.gradeCounts.get(row.grd_nm) ?? 0;
    group.gradeCounts.set(row.grd_nm, gc + 1);
    if (gc + 1 > (group.gradeCounts.get(group.grade) ?? 0)) group.grade = row.grd_nm;
  }
  return [...groups.values()];
}

function average(values: number[]): number {
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/** 그룹이 가진 조사일자를 최신순으로 */
function datesDesc(group: Group): string[] {
  return [...group.byDate.keys()].sort().reverse();
}

/**
 * 대표 그룹을 고른다.
 * 조사일이 가장 최신인 그룹을 우선하고, 같으면 조사 시장이 많은 쪽을 쓴다.
 * (마지막에 품종명으로 한 번 더 정렬해 실행마다 결과가 흔들리지 않게 한다)
 */
function pickGroup(groups: Group[], preferVariety?: string): Group | null {
  if (groups.length === 0) return null;
  const preferred = preferVariety ? groups.filter((g) => g.variety === preferVariety) : [];
  const pool = preferred.length > 0 ? preferred : groups;
  return [...pool].sort((a, b) => {
    const aLatest = datesDesc(a)[0] ?? '';
    const bLatest = datesDesc(b)[0] ?? '';
    if (aLatest !== bLatest) return bLatest.localeCompare(aLatest);
    const aCount = a.byDate.get(aLatest)?.length ?? 0;
    const bCount = b.byDate.get(bLatest)?.length ?? 0;
    return bCount - aCount || a.variety.localeCompare(b.variety);
  })[0];
}

function toTime(ymd: string): number {
  return Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
}

/**
 * 비교 기준일.
 * 되도록 5일 이상 떨어진 조사일과 비교해 "지난주 대비"에 가깝게 만들고,
 * 그런 날이 없으면 바로 직전 조사일과 비교한다. 어느 날과 비교했는지는 화면에 함께 보여준다.
 */
function pickCompareDate(dates: string[], latest: string): string | null {
  const older = dates.filter((d) => d < latest);
  if (older.length === 0) return null;
  return older.find((d) => toTime(latest) - toTime(d) >= 5 * 86400000) ?? older[0];
}

function toRow(cfg: CatalogItem, group: Group, label: string | null): MarketPriceRow | null {
  const dates = datesDesc(group);
  const latest = dates[0];
  if (!latest) return null;
  const prices = group.byDate.get(latest) ?? [];
  if (prices.length === 0) return null;

  const price = average(prices);
  const compareDate = pickCompareDate(dates, latest);
  const prevList = compareDate ? group.byDate.get(compareDate) : undefined;
  const prevPrice = prevList && prevList.length > 0 ? average(prevList) : null;

  const trend = [...dates]
    .reverse()
    .slice(-8)
    .map<PricePoint>((d) => ({ date: d, price: average(group.byDate.get(d) ?? [0]) }))
    .filter((p) => p.price > 0);

  return {
    // 품종이 하나뿐인 품목은 품목명 그대로, 여러 개면 "품목명 품종" 으로 구분한다.
    key: label ? `${cfg.key}::${label}` : cfg.key,
    itemKey: cfg.key,
    name: label ? `${cfg.name} ${label}` : cfg.name,
    emoji: cfg.emoji,
    group: cfg.group,
    variety: group.variety,
    grade: group.grade,
    unitLabel: group.unitLabel,
    price,
    marketCount: prices.length,
    date: latest,
    prevPrice,
    prevDate: prevPrice === null ? null : compareDate,
    changeRate:
      prevPrice && prevPrice > 0 ? Math.round(((price - prevPrice) / prevPrice) * 1000) / 10 : null,
    trend,
  };
}

/**
 * 품목 하나가 가진 모든 품종을 각각 줄로 만든다.
 *
 * 품종이 하나뿐이면 품목명 그대로 한 줄(예: "양파"), 여러 개면 품종마다 한 줄씩
 * (예: "오이 가시계통", "오이 다다기계통", "오이 취청") 만든다. 최신 조사일이 있는
 * 품종만 남기고, 조사 시장이 많은 순으로 정렬한다.
 */
function toRows(cfg: CatalogItem, groups: Group[]): MarketPriceRow[] {
  const usable = groups.filter((g) => datesDesc(g).length > 0);
  const multi = usable.length > 1;
  const rows = usable
    .map((g) => toRow(cfg, g, multi ? g.variety : null))
    .filter((r): r is MarketPriceRow => r !== null);

  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.marketCount - a.marketCount);
}

/**
 * 한 분류의 시세를 모은다.
 *
 * 품목당 한 번씩 불러야 해서 분류 단위로 나눠 조회한다(전체를 한 번에 부르면 너무 오래 걸린다).
 * 품목 하나가 실패하거나 자료가 없으면 그 줄만 빼고 나머지는 그대로 보여준다.
 */
export async function fetchGroupPrices(
  group: MarketGroup,
  channel: SalesChannel,
  region: string | null,
  revalidate: number,
): Promise<MarketPricesResult> {
  if (!isMarketApiConfigured()) throw new Error('시세 기능이 아직 설정되지 않았습니다.');

  const se = SALES_CHANNELS[channel];
  const from = daysAgoYmd(WINDOW_DAYS);
  const to = daysAgoYmd(0);

  // 이 분류에서, 해당 채널 자료가 있는 품목만 부른다.
  const configs = CATALOG.filter((c) => c.group === group && (channel === 'retail' ? c.retail : c.wholesale));

  const results = await Promise.all(
    configs.map(async (cfg) => {
      try {
        const rows = await fetchWindow(cfg, se, from, to, revalidate);
        return toRows(cfg, groupRows(rows, region));
      } catch {
        return [];
      }
    }),
  );

  const rows = results.flat();
  // 카탈로그 순서를 유지하되, 같은 품목 안 여러 품종은 toRows 가 정한 순서(조사 시장 많은 순)를 지킨다.
  const order = new Map(CATALOG.map((c, i) => [c.key, i]));
  rows.sort((a, b) => (order.get(a.itemKey) ?? 0) - (order.get(b.itemKey) ?? 0));

  return {
    channel,
    group,
    region,
    rows,
    latestDate: rows.reduce<string | null>((max, r) => (!max || r.date > max ? r.date : max), null),
  };
}

// ─────────────────────────────────────────────
// 품목 하나의 기간별 가격 추이
// ─────────────────────────────────────────────

export const HISTORY_PERIODS = ['7d', '1m', '3m', '1y'] as const;
export type HistoryPeriod = (typeof HISTORY_PERIODS)[number];

export const HISTORY_PERIOD_LABELS: Record<HistoryPeriod, string> = {
  '7d': '7일',
  '1m': '1개월',
  '3m': '3개월',
  '1y': '1년',
};

/**
 * 기간을 짧은 창 여러 개로 "표본 추출" 한다.
 *
 * 1년치를 한 번에 받으면 안 된다. 이 API 는 조사일×시장 단위로 행이 나오고 한 페이지가
 * 1000행이라, 소(쇠고기)처럼 품종이 많은 품목은 1년이면 6만 행(=60페이지)이 된다.
 * 그렇게 몰아치면 429 로 막힌다.
 *
 * 대신 기간 안에 3일짜리 창을 일정 간격으로 두고 각 창의 최신 조사일만 뽑는다.
 * 그러면 호출 수가 품목 크기와 무관하게 창 개수(8~12개)로 고정된다.
 * 추이 그래프는 촘촘한 일별 값보다 흐름이 중요하므로 이 방식으로 충분하다.
 */
function sampleWindows(period: HistoryPeriod): { from: string; to: string }[] {
  const win = (fromDaysAgo: number, toDaysAgo: number) => ({
    from: daysAgoYmd(fromDaysAgo),
    to: daysAgoYmd(toDaysAgo),
  });

  /**
   * 가장 최근 구간은 항상 9일로 넉넉히 잡는다.
   * 품목마다 마지막 조사일이 며칠씩 다르기 때문에(양파는 오늘 기준 4일 전이 최신이었다)
   * 좁게 잡으면 "지금 가격"이 그래프에서 빠진다.
   */
  const recent = win(9, 0);

  if (period === '7d') return [recent];
  // 1개월은 창 두 개로 기간 전체를 덮어 조사일을 촘촘히 쓴다.
  if (period === '1m') return [win(32, 16), win(18, 0)];

  // 3개월·1년은 일정 간격으로 6일짜리 창을 두고 각 창의 최신 조사일만 뽑는다.
  const { step, count } = period === '3m' ? { step: 15, count: 6 } : { step: 30, count: 12 };
  const windows: { from: string; to: string }[] = [];
  for (let i = count; i >= 1; i -= 1) {
    const offset = i * step;
    windows.push(win(offset + 6, offset));
  }
  windows.push(recent);
  return windows;
}

export interface HistoryPoint {
  date: string;
  price: number;
  marketCount: number;
}

export interface ItemHistoryResult {
  key: string;
  name: string;
  channel: SalesChannel;
  region: string | null;
  period: HistoryPeriod;
  /** 비교 가능한 기준 (이 단위·품종끼리만 이어 붙인다) */
  unitLabel: string;
  variety: string;
  points: HistoryPoint[];
}

/**
 * 같은 창 안에서 "이어 붙일 수 있는" 그룹을 고른다.
 *
 * 단위가 다르면 가격을 나란히 놓을 수 없으므로(1kg vs 100g) 단위가 같은 것만 쓴다.
 * 품종명은 조사일마다 바뀌는 경우가 있어(닭 → 육계12호/육계(kg)) 같은 품종을 우선하되,
 * 없으면 단위가 같은 그룹 중 조사 시장이 많은 쪽을 쓴다.
 */
function pickComparable(groups: Group[], unitLabel: string, variety: string): Group | null {
  const sameUnit = groups.filter((g) => g.unitLabel === unitLabel);
  if (sameUnit.length === 0) return null;
  const sameVariety = sameUnit.filter((g) => g.variety === variety);
  const pool = sameVariety.length > 0 ? sameVariety : sameUnit;
  return [...pool].sort((a, b) => {
    const aLatest = datesDesc(a)[0] ?? '';
    const bLatest = datesDesc(b)[0] ?? '';
    if (aLatest !== bLatest) return bLatest.localeCompare(aLatest);
    return (b.byDate.get(bLatest)?.length ?? 0) - (a.byDate.get(aLatest)?.length ?? 0);
  })[0];
}

/**
 * 품목 하나의 기간별 가격 추이.
 *
 * variety 를 지정하면 그 품종만 골라 추이를 만든다(한 품목에 품종이 여러 개일 때,
 * 목록에서 고른 그 줄과 정확히 같은 걸 보여주기 위해서다). 지정하지 않으면
 * 조사 시장이 가장 많은 품종을 대표로 쓴다.
 */
export async function fetchItemHistory(
  cfg: CatalogItem,
  channel: SalesChannel,
  region: string | null,
  period: HistoryPeriod,
  revalidate: number,
  variety?: string,
): Promise<ItemHistoryResult> {
  if (!isMarketApiConfigured()) throw new Error('시세 기능이 아직 설정되지 않았습니다.');

  const se = SALES_CHANNELS[channel];
  const windows = sampleWindows(period);

  const perWindow = await Promise.all(
    windows.map(async (w) => {
      try {
        const rows = await fetchWindow(cfg, se, w.from, w.to, revalidate);
        return groupRows(rows, region);
      } catch {
        return [] as Group[];
      }
    }),
  );

  // 기준은 가장 최근 창(마지막)에서 정한다. 그 창이 비면 뒤에서부터 찾는다.
  let reference: Group | null = null;
  for (let i = perWindow.length - 1; i >= 0 && !reference; i -= 1) {
    reference = pickGroup(perWindow[i], variety);
  }
  if (!reference) {
    return {
      key: cfg.key,
      name: cfg.name,
      channel,
      region,
      period,
      unitLabel: '',
      variety: '',
      points: [],
    };
  }

  // 7일·1개월은 창이 기간 전체를 덮으므로 조사일을 모두 쓴다.
  // 3개월·1년은 창이 띄엄띄엄 있으므로 창마다 최신 조사일 하나만 쓴다.
  const useAllDates = period === '7d' || period === '1m';

  const points: HistoryPoint[] = [];
  for (const groups of perWindow) {
    const group = pickComparable(groups, reference.unitLabel, reference.variety);
    if (!group) continue;
    const dates = datesDesc(group);
    const wanted = useAllDates ? [...dates].reverse() : dates.slice(0, 1);
    for (const d of wanted) {
      const prices = group.byDate.get(d) ?? [];
      if (prices.length > 0) {
        points.push({ date: d, price: average(prices), marketCount: prices.length });
      }
    }
  }

  // 창이 겹쳐 같은 조사일이 두 번 들어가는 경우를 정리한다.
  const seen = new Set<string>();
  const unique = points
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((p) => (seen.has(p.date) ? false : (seen.add(p.date), true)));

  return {
    key: cfg.key,
    name: cfg.name,
    channel,
    region,
    period,
    unitLabel: reference.unitLabel,
    variety: reference.variety,
    points: unique,
  };
}
