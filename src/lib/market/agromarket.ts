import 'server-only';

/**
 * 농산물 시세 (한국농수산식품유통공사 일별 도·소매 가격정보).
 *
 * 공공데이터포털: https://www.data.go.kr/data/15156057/openapi.do
 * 엔드포인트: https://apis.data.go.kr/B552845/perDay/price
 *
 * 서버에서만 호출한다. 인증키(DATA_GO_KR_SERVICE_KEY)는 브라우저에 노출되면 안 되고,
 * 이 API 는 브라우저에서 직접 부를 수도 없다(CORS). 그래서 /api/market-prices 라우트가
 * 대신 호출하고 결과만 내려준다.
 *
 * ── 실제로 확인한 API 동작 (추측이 아니라 호출해서 확인한 내용) ──
 *  - 조회 조건은 `cond[필드::연산자]` 형식이다. 예) cond[exmn_ymd::GTE]=20260801
 *    (startDate 같은 흔한 이름은 조용히 무시되고 0건이 돌아온다.)
 *  - 부류코드(ctgry_cd)와 품목코드(item_cd)는 사실상 필수다. 날짜만 주면 0건이 온다.
 *  - numOfRows 상한은 1000 이다. 그보다 큰 값을 줘도 1000 으로 잘린다.
 *  - 결과는 조사일자 오름차순이다. 그래서 "최신 날짜"를 얻으려면 마지막 페이지를 봐야 한다.
 *  - kg환산가격(exmn_dd_cnvs_prc)은 축산물에서 값이 어긋난다(돼지·소가 똑같이 29300).
 *    그래서 조사일가격(exmn_dd_prc)과 단위(unit, unit_sz)를 그대로 쓴다.
 *  - 같은 품목 안에 품종·등급·단위가 여러 개 섞여 있다(예: 돼지 → 삼겹살/앞다리/갈비/목심).
 *    평균을 내려면 반드시 품종·등급·단위별로 묶어야 한다.
 */

const ENDPOINT = 'https://apis.data.go.kr/B552845/perDay/price';
const MAX_ROWS = 1000;

/** 구분코드 */
export const SALES_CHANNELS = { retail: '01', wholesale: '02' } as const;
export type SalesChannel = keyof typeof SALES_CHANNELS;

interface RawItem {
  exmn_ymd: string;
  se_cd: string;
  se_nm: string;
  ctgry_cd: string;
  ctgry_nm: string;
  item_cd: string;
  item_nm: string;
  vrty_cd: string;
  vrty_nm: string;
  grd_cd: string;
  grd_nm: string;
  sgg_cd: string;
  sgg_nm: string;
  unit: string;
  unit_sz: string;
  mrkt_cd: string;
  mrkt_nm: string;
  /** 조사일가격 (단위 = unit_sz + unit) */
  exmn_dd_prc: string;
  /** kg환산가격 — 축산물에서 신뢰할 수 없어 쓰지 않는다. */
  exmn_dd_cnvs_prc: string;
  orgnl_reg_dt: string;
}

/**
 * 화면에 보여줄 품목 목록.
 *
 * 모두 실제로 호출해서 데이터가 오는 것만 넣었다.
 * (부추 265·콩나물 265·표고버섯 322·쇠고기 512·돼지고기 514·계란 516 은 0건이라 제외)
 *
 * variety 를 지정하면 그 품종만 골라 쓴다. 지정하지 않으면 조사 시장이 가장 많은
 * 품종을 대표값으로 쓴다.
 */
export interface MarketItemConfig {
  key: string;
  label: string;
  group: string;
  ctgry: string;
  item: string;
  variety?: string;
}

export const MARKET_ITEMS: MarketItemConfig[] = [
  { key: 'onion', label: '양파', group: '채소류', ctgry: '200', item: '245' },
  { key: 'greenonion', label: '파', group: '채소류', ctgry: '200', item: '246' },
  { key: 'cabbage', label: '배추', group: '채소류', ctgry: '200', item: '211' },
  { key: 'radish', label: '무', group: '채소류', ctgry: '200', item: '231' },
  { key: 'carrot', label: '당근', group: '채소류', ctgry: '200', item: '232' },
  { key: 'cucumber', label: '오이', group: '채소류', ctgry: '200', item: '223' },
  { key: 'zucchini', label: '호박', group: '채소류', ctgry: '200', item: '224' },
  { key: 'lettuce', label: '상추', group: '채소류', ctgry: '200', item: '214' },
  { key: 'greenchili', label: '풋고추', group: '채소류', ctgry: '200', item: '242' },
  { key: 'garlic', label: '깐마늘(국산)', group: '채소류', ctgry: '200', item: '258' },
  { key: 'perilla', label: '깻잎', group: '채소류', ctgry: '200', item: '253' },

  { key: 'potato', label: '감자', group: '식량작물', ctgry: '100', item: '152' },
  { key: 'rice', label: '쌀', group: '식량작물', ctgry: '100', item: '111' },

  { key: 'oystermushroom', label: '느타리버섯', group: '버섯', ctgry: '300', item: '315' },

  { key: 'pork-samgyeop', label: '돼지 삼겹살', group: '축산물', ctgry: '500', item: '4304', variety: '삼겹살' },
  { key: 'pork-front', label: '돼지 앞다리', group: '축산물', ctgry: '500', item: '4304', variety: '앞다리' },
  { key: 'chicken', label: '닭', group: '축산물', ctgry: '500', item: '9901' },
  { key: 'egg', label: '계란', group: '축산물', ctgry: '500', item: '9903' },
  // 소(4301) 는 제외했다. 조사 지연이 5~9일이라 최근 조사일이 자주 비고, 품종·등급이
  // 수십 가지(안심 1++ 등)로 갈려 "소 평균가" 라는 대표값 자체가 의미를 갖기 어렵다.

  { key: 'gochujang', label: '고추장', group: '가공품', ctgry: '800', item: '814' },
  { key: 'tofu', label: '두부', group: '가공품', ctgry: '800', item: '812' },
];

export const MARKET_GROUPS = ['채소류', '식량작물', '버섯', '축산물', '가공품'] as const;

export interface MarketPriceRow {
  key: string;
  label: string;
  group: string;
  /** 품종명 (예: 삼겹살, 여름(고랭지)) */
  variety: string;
  /** 등급명 (예: 상품, 1++등급) */
  grade: string;
  /** 가격 기준 단위 (예: 1kg, 100g, 1포기) */
  unitLabel: string;
  /** 조사 시장 평균 가격 (원) */
  price: number;
  /** 평균에 쓰인 조사 시장 수 */
  marketCount: number;
  /** 조사일자 (YYYYMMDD) */
  date: string;
  /** 비교 시점 가격 — 없으면 null */
  prevPrice: number | null;
  prevDate: string | null;
  /** 비교 시점 대비 변동률 (%) — 없으면 null */
  changeRate: number | null;
}

export interface MarketPricesResult {
  rows: MarketPriceRow[];
  /** 이 목록에서 가장 최근 조사일자 */
  latestDate: string | null;
  fetchedAt: string;
}

function serviceKey(): string {
  return (process.env.DATA_GO_KR_SERVICE_KEY ?? '').trim();
}

export const isMarketApiConfigured = (): boolean => serviceKey().length > 0;

/** 오늘부터 daysAgo 일 전 날짜 (한국 시간 기준) */
function daysAgoYmd(daysAgo: number): string {
  // 서버 시간대가 UTC 여도 한국 날짜가 나오도록 +9시간 보정한 뒤 계산한다.
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  nowKst.setUTCDate(nowKst.getUTCDate() - daysAgo);
  const y = nowKst.getUTCFullYear();
  const m = String(nowKst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(nowKst.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function buildUrl(params: {
  ctgry: string;
  item: string;
  se: string;
  from: string;
  to: string;
  pageNo: number;
}): string {
  // URLSearchParams 가 값을 자동으로 인코딩하므로 인증키는 "디코딩된" 값을 넣어야 한다.
  const q = new URLSearchParams({
    serviceKey: serviceKey(),
    pageNo: String(params.pageNo),
    numOfRows: String(MAX_ROWS),
    returnType: 'json',
    'cond[exmn_ymd::GTE]': params.from,
    'cond[exmn_ymd::LTE]': params.to,
    'cond[se_cd::EQ]': params.se,
    'cond[ctgry_cd::EQ]': params.ctgry,
    'cond[item_cd::EQ]': params.item,
  });
  return `${ENDPOINT}?${q.toString()}`;
}

interface ApiBody {
  /** 결과가 없을 때 빈 문자열로 오는 경우가 있다. */
  items?: { item?: RawItem[] } | '';
  totalCount?: number;
  numOfRows?: number;
  pageNo?: number;
}

interface ApiResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: ApiBody;
  };
}

function readItems(body: ApiBody): RawItem[] {
  const items = body.items;
  if (!items || typeof items === 'string') return [];
  return items.item ?? [];
}

/**
 * 한 품목의 기간 데이터를 가져온다.
 *
 * 결과가 조사일자 오름차순이고 numOfRows 상한이 1000 이므로, 1000건을 넘으면
 * 마지막 페이지도 같이 받아 최신 날짜가 빠지지 않게 한다.
 */
async function fetchWindow(
  cfg: MarketItemConfig,
  se: string,
  from: string,
  to: string,
  revalidate: number,
): Promise<RawItem[]> {
  const get = async (pageNo: number): Promise<{ rows: RawItem[]; total: number }> => {
    const res = await fetch(buildUrl({ ctgry: cfg.ctgry, item: cfg.item, se, from, to, pageNo }), {
      next: { revalidate },
    });
    if (!res.ok) throw new Error(`시세 API 응답 오류 (${res.status})`);
    const json = (await res.json()) as ApiResponse;
    const code = json.response?.header?.resultCode;
    if (code && code !== '0' && code !== '00') {
      throw new Error(json.response?.header?.resultMsg || '시세 API 오류');
    }
    const body = json.response?.body;
    if (!body) return { rows: [], total: 0 };
    return { rows: readItems(body), total: body.totalCount ?? 0 };
  };

  const first = await get(1);
  const lastPage = Math.ceil(first.total / MAX_ROWS);
  if (lastPage <= 1) return first.rows;

  // 최신 날짜는 마지막 페이지에 있다.
  const last = await get(lastPage);
  return [...first.rows, ...last.rows];
}

/**
 * 품종·등급·단위가 같은 것끼리, 다시 조사일자별로 묶는다.
 *
 * 한 품목 안에 품종이 여러 개 섞여 있어(돼지 → 삼겹살/앞다리/갈비/목심) 그냥 평균을
 * 내면 안 된다. 또 품종명이 조사일마다 바뀌는 경우가 있어(닭 → "육계12호"/"육계(kg)",
 * 풋고추 → "풋고추(녹광 등)"/"꽈리고추") 비교는 반드시 같은 그룹 안에서만 해야 한다.
 */
interface Group {
  variety: string;
  grade: string;
  unitLabel: string;
  /** 조사일자 → 그 날 각 시장의 가격들 */
  byDate: Map<string, number[]>;
}

function groupRows(rows: RawItem[]): Group[] {
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const price = Number(row.exmn_dd_prc);
    if (!Number.isFinite(price) || price <= 0) continue;
    const unitLabel = `${row.unit_sz}${row.unit}`;
    const key = `${row.vrty_nm}|${row.grd_nm}|${unitLabel}`;
    let group = groups.get(key);
    if (!group) {
      group = { variety: row.vrty_nm, grade: row.grd_nm, unitLabel, byDate: new Map() };
      groups.set(key, group);
    }
    const list = group.byDate.get(row.exmn_ymd);
    if (list) list.push(price);
    else group.byDate.set(row.exmn_ymd, [price]);
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
 *
 * 조사일이 가장 최신인 그룹을 우선하고, 같으면 조사 시장이 많은 쪽을 쓴다.
 * (마지막에 품종명으로 한 번 더 정렬해 실행할 때마다 결과가 바뀌지 않게 한다)
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

function toDate(ymd: string): number {
  return Date.UTC(
    Number(ymd.slice(0, 4)),
    Number(ymd.slice(4, 6)) - 1,
    Number(ymd.slice(6, 8)),
  );
}

/**
 * 비교 기준일을 고른다.
 *
 * 되도록 5일 이상 떨어진 조사일과 비교해 "지난주 대비" 에 가깝게 보여주고,
 * 그런 날이 없으면 바로 직전 조사일과 비교한다. 어느 날과 비교했는지는 화면에 함께 보여준다.
 */
function pickCompareDate(dates: string[], latest: string): string | null {
  const older = dates.filter((d) => d < latest);
  if (older.length === 0) return null;
  const weekish = older.find((d) => toDate(latest) - toDate(d) >= 5 * 24 * 60 * 60 * 1000);
  return weekish ?? older[0];
}

/** 요청을 한꺼번에 다 던지지 않고 나눠서 보낸다. (공공 API 에 부담을 주지 않도록) */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    out.push(...(await Promise.all(items.slice(i, i + limit).map(fn))));
  }
  return out;
}

/**
 * 전체 품목의 시세를 모은다.
 *
 * 같은 (부류·품목) 을 여러 번 부르지 않도록 묶어서 한 번만 호출하고,
 * 품목 하나가 실패하거나 데이터가 없으면 그 줄만 빼고 나머지는 그대로 보여준다.
 */
export async function fetchMarketPrices(
  channel: SalesChannel,
  revalidate: number,
): Promise<MarketPricesResult> {
  if (!isMarketApiConfigured()) {
    throw new Error('시세 기능이 아직 설정되지 않았습니다.');
  }
  const se = SALES_CHANNELS[channel];

  // (부류·품목) 이 같은 설정들은 한 번만 조회해서 나눠 쓴다. (돼지 삼겹살/앞다리)
  const byEndpoint = new Map<string, MarketItemConfig[]>();
  for (const cfg of MARKET_ITEMS) {
    const k = `${cfg.ctgry}-${cfg.item}`;
    const list = byEndpoint.get(k);
    if (list) list.push(cfg);
    else byEndpoint.set(k, [cfg]);
  }

  // 조사가 며칠 늦게 올라오는 품목도 있어 2주치를 한 번에 받아 그 안에서 비교까지 끝낸다.
  const from = daysAgoYmd(13);
  const to = daysAgoYmd(0);

  const results = await mapWithConcurrency([...byEndpoint.values()], 5, async (configs) => {
    try {
      // 같은 품목이면 조회는 한 번, 품종만 다르게 골라 쓴다. (돼지 삼겹살/앞다리)
      const rows = await fetchWindow(configs[0], se, from, to, revalidate);
      const groups = groupRows(rows);

      return configs.flatMap<MarketPriceRow>((cfg) => {
        const group = pickGroup(groups, cfg.variety);
        if (!group) return [];
        const dates = datesDesc(group);
        const latest = dates[0];
        if (!latest) return [];

        const prices = group.byDate.get(latest) ?? [];
        if (prices.length === 0) return [];
        const price = average(prices);

        const compareDate = pickCompareDate(dates, latest);
        const prevPrices = compareDate ? group.byDate.get(compareDate) : undefined;
        const prevPrice = prevPrices && prevPrices.length > 0 ? average(prevPrices) : null;
        const changeRate =
          prevPrice && prevPrice > 0
            ? Math.round(((price - prevPrice) / prevPrice) * 1000) / 10
            : null;

        return [
          {
            key: cfg.key,
            label: cfg.label,
            group: cfg.group,
            variety: group.variety,
            grade: group.grade,
            unitLabel: group.unitLabel,
            price,
            marketCount: prices.length,
            date: latest,
            prevPrice,
            prevDate: prevPrice === null ? null : compareDate,
            changeRate,
          },
        ];
      });
    } catch {
      // 품목 하나가 실패해도 전체를 망치지 않는다.
      return [];
    }
  });

  const rows = results.flat();
  // 설정 순서를 유지한다.
  const order = new Map(MARKET_ITEMS.map((c, i) => [c.key, i]));
  rows.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));

  return {
    rows,
    latestDate: rows.reduce<string | null>(
      (max, r) => (!max || r.date > max ? r.date : max),
      null,
    ),
    fetchedAt: new Date().toISOString(),
  };
}
