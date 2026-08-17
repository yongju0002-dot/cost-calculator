'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { IconArrowDown, IconCheck } from '@/components/ui/Icons';
import { useAuth } from '@/lib/auth/auth';
import { costRateLevel } from '@/lib/domain/cost';
import { formatPercent, formatWon } from '@/lib/domain/money';
import { useData } from '@/lib/store/data';

/**
 * 메인페이지 전용 예시(DEMO) 데이터.
 *
 * 실제 계산 공식(원가율 = 재료 원가 ÷ 판매가격 × 100, 예상 이익 = 판매가격 - 재료 원가)과
 * 반드시 일치하도록 숫자를 손으로 맞춰 두었다 — 화면에 보이는 숫자를 따로 하드코딩하지
 * 않고 아래 값들로부터 계산해서 쓴다. 로그인 여부와 무관하게 항상 이 고정 예시만 쓴다.
 */
const DEMO_MENU_NAME = '제육볶음';
const DEMO_PRICE = 12000;
const DEMO_BREAKDOWN = [
  { label: '돼지고기', amount: 1800 },
  { label: '양념', amount: 620 },
  { label: '채소', amount: 520 },
  { label: '부자재', amount: 300 },
];
const DEMO_COST = DEMO_BREAKDOWN.reduce((sum, row) => sum + row.amount, 0);
const DEMO_RATE = (DEMO_COST / DEMO_PRICE) * 100;
const DEMO_MARGIN = DEMO_PRICE - DEMO_COST;
const DEMO_LEVEL = costRateLevel(DEMO_RATE);

const WORKFLOW_STEPS = [
  { step: '01', title: '재료', items: ['돼지고기', '양파', '고추장', '간장'] },
  { step: '02', title: '프렙', items: ['제육 양념장'] },
  { step: '03', title: '부자재', items: ['도시락 용기', '젓가락'] },
  { step: '04', title: '메뉴', items: ['제육 도시락'] },
];
const WORKFLOW_COST = 3650;
const WORKFLOW_PRICE = 12000;
const WORKFLOW_RATE = (WORKFLOW_COST / WORKFLOW_PRICE) * 100;

const VALUE_STRIP_ITEMS = ['회원가입 없이 계산', '재료부터 메뉴까지 관리', '기본 원가관리 무료'];

const FEATURE_GRID = [
  { emoji: '🧮', title: '메뉴 원가 계산', desc: '재료·프렙·부자재 사용량을 더해 메뉴 원가를 계산합니다.' },
  { emoji: '📊', title: '원가율 계산', desc: '재료 원가 ÷ 판매가격으로 원가율을 자동 계산합니다.' },
  { emoji: '💰', title: '예상 이익', desc: '판매가격에서 재료비를 뺀 예상 이익을 보여줍니다.' },
  { emoji: '🏷️', title: '적정 판매가격', desc: '목표 원가율에 맞는 판매가격을 계산합니다.' },
  { emoji: '🧺', title: '재료 관리', desc: '식자재 구매가격과 단위 원가를 저장해 재사용합니다.' },
  { emoji: '🍲', title: '프렙 관리', desc: '소스·양념·육수 같은 프렙의 원가를 관리합니다.' },
  { emoji: '📦', title: '부자재 관리', desc: '용기·포장재 등 부자재 원가를 관리합니다.' },
  { emoji: '📈', title: '매입가 관리', desc: '매입가 이력을 기록하고 최신·평균 단가를 적용합니다.' },
  { emoji: '📋', title: '대량 등록', desc: '붙여넣기나 엑셀로 재료·부자재를 한 번에 등록합니다.' },
  { emoji: '🥬', title: '농산물 시세', desc: '주요 식자재의 도매·소매 가격과 변동을 확인합니다.' },
];

const PRINCIPLES = [
  { step: '01', title: '쉽게', desc: '처음 사용하는 사람도 바로 이해할 수 있도록 만들었습니다.' },
  { step: '02', title: '빠르게', desc: '복잡한 입력 없이 필요한 계산을 빠르게 끝냅니다.' },
  { step: '03', title: '현실적으로', desc: '재료뿐 아니라 프렙과 부자재까지 실제 음식점 원가에 맞췄습니다.' },
];

const FREE_CHECKLIST = [
  '메뉴 원가 계산',
  '원가율 계산',
  '예상 이익 계산',
  '재료 관리',
  '프렙 관리',
  '부자재 관리',
  '매입가 관리',
];

const USE_STEPS = [
  { title: '재료 가격 입력', desc: '구매가격과 수량을 입력하면 단위 원가가 자동으로 계산됩니다.' },
  { title: '메뉴에 사용하는 재료 추가', desc: '메뉴에 들어가는 재료와 프렙, 부자재를 추가하세요.' },
  { title: '원가와 원가율 확인', desc: '원가, 원가율, 예상 이익을 바로 확인할 수 있습니다.' },
];

interface FaqItem {
  question: string;
  answer: string;
}

export function HomeClient({ faqItems }: { faqItems: FaqItem[] }) {
  return (
    <>
      <Hero />
      <ValueStrip />
      <ProductValueSection />
      <WorkflowSection />
      <PersonalizedSection />
      <FeatureGridSection />
      <WhySection />
      <FreeValueSection />
      <UseStepsSection />
      <FaqSection items={faqItems} />
      <FinalCtaSection />
    </>
  );
}

// ─────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink-100 bg-gradient-to-b from-brand-50/60 to-white">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:py-24">
        <div>
          <Badge tone="brand">🍽️ 음식점 사장님을 위한 원가관리</Badge>
          <h1 className="mt-5 text-[2.25rem] font-extrabold leading-[1.2] tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.15] lg:text-6xl">
            우리 가게 음식 원가,
            <br />
            이제 쉽게 관리하세요.
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-600 sm:text-lg">
            재료부터 프렙, 부자재까지 관리하고 메뉴별 원가와 원가율을 한눈에 확인하세요.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/calculator" className={buttonClass('primary', 'lg', 'w-full sm:w-auto')}>
              무료로 원가 계산하기
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-13 items-center justify-center gap-1.5 rounded-xl px-4 text-[15px] font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              어떻게 사용하는지 보기
              <IconArrowDown width={16} height={16} strokeWidth={2.3} />
            </a>
          </div>
          <p className="mt-4 text-sm font-medium text-ink-500">회원가입 없이 바로 계산할 수 있어요.</p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <div className="rounded-2xl border border-ink-200 bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
              <span className="text-sm font-extrabold text-ink-900">WongaGo</span>
              <span className="text-xs font-semibold text-ink-400">오늘</span>
            </div>
            <div className="px-5 py-5">
              <p className="text-xs font-bold text-ink-400">메뉴 원가</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-lg font-extrabold text-ink-900">{DEMO_MENU_NAME}</p>
                {DEMO_LEVEL ? (
                  <Badge tone={DEMO_LEVEL.id === 'low' ? 'success' : 'info'}>원가율 {DEMO_LEVEL.label}</Badge>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-ink-50 px-2 py-3 text-center">
                  <p className="text-[11px] font-semibold text-ink-500">원가</p>
                  <p className="tnum mt-1 text-[15px] font-extrabold text-ink-900">{formatWon(DEMO_COST)}</p>
                </div>
                <div className="rounded-xl bg-ink-50 px-2 py-3 text-center">
                  <p className="text-[11px] font-semibold text-ink-500">원가율</p>
                  <p className="tnum mt-1 text-[15px] font-extrabold text-emerald-600">
                    {formatPercent(DEMO_RATE)}
                  </p>
                </div>
                <div className="rounded-xl bg-ink-50 px-2 py-3 text-center">
                  <p className="text-[11px] font-semibold text-ink-500">예상이익</p>
                  <p className="tnum mt-1 text-[15px] font-extrabold text-ink-900">{formatWon(DEMO_MARGIN)}</p>
                </div>
              </div>

              <p className="mt-5 text-xs font-bold text-ink-400">원가 구성</p>
              <dl className="mt-2 flex flex-col divide-y divide-ink-100">
                {DEMO_BREAKDOWN.map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 text-sm">
                    <dt className="text-ink-600">{row.label}</dt>
                    <dd className="tnum font-semibold text-ink-800">{formatWon(row.amount)}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-sm font-semibold text-ink-600">판매가격</span>
                <span className="tnum text-base font-extrabold text-ink-900">{formatWon(DEMO_PRICE)}</span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -left-5 top-6 hidden rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 shadow-card lg:block">
            <p className="text-[11px] font-semibold text-ink-400">원가율</p>
            <p className="tnum text-base font-extrabold text-emerald-600">{formatPercent(DEMO_RATE)}</p>
          </div>
          <div className="pointer-events-none absolute -right-4 bottom-8 hidden rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 shadow-card lg:block">
            <p className="text-[11px] font-semibold text-ink-400">예상 이익</p>
            <p className="tnum text-base font-extrabold text-ink-900">{formatWon(DEMO_MARGIN)}</p>
          </div>

          <p className="mt-4 text-center text-xs text-ink-400 lg:text-left">
            예시 화면입니다. 재료 가격과 사용량만 입력하면 자동으로 계산됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Trust / Value strip
// ─────────────────────────────────────────────

function ValueStrip() {
  return (
    <section className="border-b border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-center text-sm font-bold text-ink-500">복잡한 원가 계산을 간단하게</p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-8">
          {VALUE_STRIP_ITEMS.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink-700"
            >
              <IconCheck width={16} height={16} strokeWidth={2.5} className="text-brand-500" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Product value (3 large feature blocks)
// ─────────────────────────────────────────────

function MiniIngredientMockup() {
  const rows = [
    { name: '돼지고기', amount: '200g', cost: 1800 },
    { name: '양파', amount: '100g', cost: 150 },
    { name: '고추장', amount: '30g', cost: 300 },
  ];
  const total = rows.reduce((sum, r) => sum + r.cost, 0);
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
      <p className="text-xs font-bold text-ink-400">제육볶음 · 재료 계산</p>
      <ul className="mt-3 flex flex-col divide-y divide-ink-100 text-sm">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between py-2.5">
            <span className="text-ink-600">
              {row.name} <span className="text-ink-400">{row.amount}</span>
            </span>
            <span className="tnum font-semibold text-ink-800">{formatWon(row.cost)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-center justify-between border-t border-ink-200 pt-3">
        <span className="text-sm font-bold text-ink-900">재료 원가</span>
        <span className="tnum text-lg font-extrabold text-brand-600">{formatWon(total)}</span>
      </div>
    </div>
  );
}

function MiniPriceHistoryMockup() {
  const before = 45000;
  const after = 48000;
  const change = ((after - before) / before) * 100;
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
      <p className="text-xs font-bold text-ink-400">돼지고기 · 매입가 이력</p>
      <div className="mt-3 flex flex-col divide-y divide-ink-100 text-sm">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-ink-600">이전 매입 · 5kg</span>
          <span className="tnum font-semibold text-ink-800">{formatWon(before)}</span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-ink-600">최근 매입 · 5kg</span>
          <span className="tnum font-semibold text-ink-800">{formatWon(after)}</span>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between border-t border-ink-200 pt-3">
        <span className="text-sm font-bold text-ink-900">가격 변동</span>
        <span className="tnum text-lg font-extrabold text-amber-600">▲ {formatPercent(change)}</span>
      </div>
    </div>
  );
}

function MiniPrepSupplyMockup() {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
      <p className="text-xs font-bold text-ink-400">제육 도시락 · 메뉴 원가에 반영</p>
      <div className="mt-3 flex flex-col divide-y divide-ink-100 text-sm">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-ink-600">프렙 · 제육 양념장</span>
          <span className="tnum font-semibold text-ink-800">{formatWon(620)}</span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-ink-600">부자재 · 도시락 용기</span>
          <span className="tnum font-semibold text-ink-800">{formatWon(300)}</span>
        </div>
      </div>
      <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-center text-xs font-semibold text-brand-700">
        메뉴 원가에 자동으로 더해집니다
      </p>
    </div>
  );
}

function ProductValueSection() {
  const blocks = [
    {
      no: '01',
      title: '메뉴 원가를 정확하게',
      desc: '사용하는 재료와 수량을 입력하면 메뉴 하나를 만드는 데 실제로 얼마가 필요한지 계산합니다.',
      mockup: <MiniIngredientMockup />,
    },
    {
      no: '02',
      title: '재료 가격이 바뀌어도 간편하게',
      desc: '식자재 구매가격과 매입가 이력을 관리하고, 가격이 바뀌면 메뉴 원가에 자동으로 반영됩니다.',
      mockup: <MiniPriceHistoryMockup />,
    },
    {
      no: '03',
      title: '프렙과 부자재까지',
      desc: '소스·양념·육수 같은 프렙과 용기·포장재 같은 부자재까지 메뉴 원가에 포함할 수 있습니다.',
      mockup: <MiniPrepSupplyMockup />,
    },
  ];

  return (
    <section className="bg-ink-50/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            원가 계산만 하는 게 아니에요.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
            재료 가격부터 메뉴 원가까지 WongaGo에서 한 번에 관리하세요.
          </p>
        </div>

        <div className="mt-14 flex flex-col gap-14">
          {blocks.map((block, index) => (
            <div
              key={block.no}
              className={`flex flex-col items-center gap-8 lg:flex-row lg:gap-16 ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              <div className="flex-1">
                <span className="text-sm font-extrabold text-brand-500">FEATURE {block.no}</span>
                <h3 className="mt-2 text-xl font-extrabold text-ink-900 sm:text-2xl">{block.title}</h3>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-600">{block.desc}</p>
              </div>
              <div className="w-full max-w-sm flex-1">{block.mockup}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Core workflow
// ─────────────────────────────────────────────

function WorkflowSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            재료부터 메뉴까지,
            <br />
            원가의 흐름을 연결하세요.
          </h2>
        </div>

        <div className="mt-12 flex flex-col items-center gap-2 lg:flex-row lg:flex-wrap lg:justify-center lg:gap-2">
          {WORKFLOW_STEPS.map((s) => (
            <div key={s.title} className="flex flex-col items-center gap-2 lg:flex-row">
              <div className="w-44 shrink-0 rounded-2xl border border-ink-200 bg-white p-4 text-center shadow-card">
                <span className="text-[11px] font-bold text-brand-500">STEP {s.step}</span>
                <p className="mt-1 text-[15px] font-extrabold text-ink-900">{s.title}</p>
                <ul className="mt-2 flex flex-col gap-0.5">
                  {s.items.map((item) => (
                    <li key={item} className="text-xs text-ink-500">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <IconArrowDown
                width={18}
                height={18}
                strokeWidth={2.2}
                className="shrink-0 text-ink-300 lg:-rotate-90"
                aria-hidden="true"
              />
            </div>
          ))}

          <div className="w-44 shrink-0 rounded-2xl border-2 border-brand-200 bg-brand-50 p-4 text-center">
            <span className="text-[11px] font-bold text-brand-600">RESULT</span>
            <dl className="mt-2 flex flex-col gap-1.5">
              <div>
                <dt className="text-xs text-ink-500">최종 원가</dt>
                <dd className="tnum text-[15px] font-extrabold text-ink-900">{formatWon(WORKFLOW_COST)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-500">판매가격</dt>
                <dd className="tnum text-[15px] font-extrabold text-ink-900">{formatWon(WORKFLOW_PRICE)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-500">원가율</dt>
                <dd className="tnum text-[15px] font-extrabold text-brand-600">
                  {formatPercent(WORKFLOW_RATE)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 로그인 사용자 개인화 영역 (실제 데이터)
// ─────────────────────────────────────────────

function PersonalizedSection() {
  const { user, ready: authReady } = useAuth();
  const { ready: dataReady, ingredients, preps, menus, supplies, menuViews } = useData();

  if (!authReady) return null;

  if (!user) {
    return (
      <section className="border-y border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-xl rounded-card border border-ink-200 bg-white p-8 text-center shadow-card">
            <h2 className="text-xl font-extrabold text-ink-900">내 가게 원가 현황</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
              회원가입하면 내 가게 원가 데이터를 저장하고 관리할 수 있어요.
            </p>
            <Link href="/login?mode=signup" className={buttonClass('primary', 'lg', 'mt-6')}>
              무료로 회원가입
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!dataReady) return null;

  const countCards = [
    { label: '등록 메뉴', count: menus.length, href: '/menus' },
    { label: '등록 재료', count: ingredients.length, href: '/ingredients' },
    { label: '등록 프렙', count: preps.length, href: '/preps' },
    { label: '등록 부자재', count: supplies.length, href: '/supplies' },
  ];
  const hasData = countCards.some((c) => c.count > 0);

  const recentMenus = [...menuViews]
    .sort((a, b) => (a.menu.createdAt < b.menu.createdAt ? 1 : -1))
    .slice(0, 3);
  const recentIngredients = [...ingredients]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 3);

  return (
    <section className="border-y border-ink-100 bg-ink-50/60">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <p className="text-xl font-extrabold text-ink-900">안녕하세요, {user.name}님 👋</p>
        <p className="mt-1 text-[15px] text-ink-600">오늘도 우리 가게 원가를 확인해보세요.</p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {countCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-card border border-ink-200 bg-white p-5 text-center shadow-card transition-colors hover:border-brand-300"
            >
              <p className="tnum text-3xl font-extrabold text-ink-900">{card.count}</p>
              <p className="mt-1 text-sm font-semibold text-ink-500">{card.label}</p>
            </Link>
          ))}
        </div>

        {!hasData ? (
          <div className="mt-8 rounded-card border border-dashed border-ink-300 bg-white p-8 text-center">
            <p className="text-[15px] font-semibold text-ink-600">아직 등록된 데이터가 없습니다.</p>
            <p className="mt-1 text-sm text-ink-500">첫 번째 메뉴를 만들어볼까요?</p>
            <Link href="/menus" className={buttonClass('primary', 'md', 'mt-4')}>
              첫 번째 메뉴 만들기
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-card border border-ink-200 bg-white p-5 shadow-card">
              <h3 className="text-[15px] font-bold text-ink-900">최근 등록한 메뉴</h3>
              {recentMenus.length === 0 ? (
                <p className="mt-3 text-sm text-ink-400">아직 등록한 메뉴가 없어요.</p>
              ) : (
                <ul className="mt-3 flex flex-col divide-y divide-ink-100">
                  {recentMenus.map((v) => (
                    <li key={v.menu.id}>
                      <Link
                        href={`/calculator/${v.menu.id}`}
                        className="flex items-center justify-between py-2.5 text-[15px] text-ink-800 transition-colors hover:text-brand-600"
                      >
                        <span className="font-semibold">{v.menu.name}</span>
                        <span className="tnum text-sm text-ink-500">{formatWon(v.cost)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-card border border-ink-200 bg-white p-5 shadow-card">
              <h3 className="text-[15px] font-bold text-ink-900">최근 수정한 재료</h3>
              {recentIngredients.length === 0 ? (
                <p className="mt-3 text-sm text-ink-400">아직 등록한 재료가 없어요.</p>
              ) : (
                <ul className="mt-3 flex flex-col divide-y divide-ink-100">
                  {recentIngredients.map((ing) => (
                    <li key={ing.id}>
                      <Link
                        href="/ingredients"
                        className="flex items-center justify-between py-2.5 text-[15px] text-ink-800 transition-colors hover:text-brand-600"
                      >
                        <span className="font-semibold">{ing.name}</span>
                        <span className="tnum text-sm text-ink-500">{formatWon(ing.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Feature grid
// ─────────────────────────────────────────────

function FeatureGridSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            사장님에게 필요한 원가관리 기능
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_GRID.map((f) => (
            <div key={f.title} className="rounded-card border border-ink-200 bg-white p-5 shadow-card">
              <span className="text-2xl">{f.emoji}</span>
              <h3 className="mt-3 text-[15px] font-bold text-ink-900">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 왜 WongaGo인가
// ─────────────────────────────────────────────

function WhySection() {
  return (
    <section className="bg-ink-50/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            복잡하게 만들지 않았습니다.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
            사장님이 필요한 원가 정보만 빠르게 확인할 수 있도록 만들었습니다.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.step} className="rounded-card border border-ink-200 bg-white p-6 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-[15px] font-black text-white">
                {p.step}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink-900">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 무료 강조
// ─────────────────────────────────────────────

function FreeValueSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="rounded-card border border-ink-200 bg-ink-900 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            기본 원가관리는 무료로 시작하세요.
          </h2>
          <div className="mx-auto mt-7 grid max-w-xl grid-cols-2 gap-x-6 gap-y-3 text-left sm:grid-cols-2">
            {FREE_CHECKLIST.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 text-[15px] font-medium text-ink-200">
                <IconCheck width={16} height={16} strokeWidth={2.5} className="shrink-0 text-brand-400" />
                {item}
              </span>
            ))}
          </div>
          <Link href="/login?mode=signup" className={buttonClass('primary', 'lg', 'mt-9')}>
            무료로 시작하기
          </Link>
          <p className="mt-3 text-xs text-ink-400">지금은 별도의 결제 없이 사용할 수 있습니다.</p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 3단계 사용법
// ─────────────────────────────────────────────

function UseStepsSection() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-ink-50/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            처음이어도 1분이면 시작할 수 있어요.
          </h2>
        </div>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {USE_STEPS.map((step, index) => (
            <li key={step.title} className="rounded-card border border-ink-200 bg-white p-6 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-[15px] font-black text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{step.desc}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <Link href="/calculator" className={buttonClass('primary', 'lg')}>
            무료로 원가 계산하기
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────

function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          자주 묻는 질문
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {items.map((item) => (
            <details
              key={item.question}
              className="group rounded-card border border-ink-200 bg-white p-5 shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-bold text-ink-900">
                {item.question}
                <span className="shrink-0 text-ink-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Final CTA
// ─────────────────────────────────────────────

function FinalCtaSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-20">
        <div className="rounded-card bg-brand-500 px-6 py-14 text-center sm:px-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            우리 가게 원가,
            <br />
            지금 한번 계산해보세요.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-brand-50">
            복잡한 계산 없이 필요한 원가 정보를 한눈에 확인하세요.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Link
              href="/calculator"
              className={buttonClass(
                'secondary',
                'lg',
                'w-full border-transparent bg-white text-brand-700 hover:bg-brand-50 sm:w-auto',
              )}
            >
              무료로 원가 계산하기
            </Link>
            <Link
              href="/login?mode=signup"
              className={buttonClass(
                'secondary',
                'lg',
                'w-full border-transparent bg-white/10 text-white hover:bg-white/20 sm:w-auto',
              )}
            >
              회원가입
            </Link>
          </div>
          <p className="mt-4 text-xs font-medium text-brand-100">회원가입 없이 바로 시작할 수 있습니다.</p>
        </div>
      </div>
    </section>
  );
}
