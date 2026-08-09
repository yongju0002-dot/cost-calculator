import Link from 'next/link';
import type { Metadata } from 'next';
import { buttonClass } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FAQ_ITEMS, JsonLd, faqJsonLd, webApplicationJsonLd } from '@/lib/seo';
import { formatPercent, formatWon } from '@/lib/domain/money';

export const metadata: Metadata = {
  title: '음식 원가 계산기 - 무료 메뉴 원가율 계산',
  description:
    '식재료 가격과 사용량만 입력하면 음식 원가, 원가율, 적정 판매가격을 무료로 계산할 수 있습니다. 음식점·카페·분식집·베이커리 사장님을 위한 원가 관리 서비스.',
  alternates: { canonical: '/' },
};

const PREVIEW = {
  name: '제육볶음',
  cost: 3240,
  price: 12000,
};

const STEPS = [
  {
    title: '재료를 입력합니다',
    description: '돼지고기 45,000원 / 5kg 처럼 구매한 그대로 넣으면 1g당 9원까지 자동으로 계산됩니다.',
  },
  {
    title: '사용량을 입력합니다',
    description: '메뉴 1인분에 들어가는 양(200g)을 넣으면 재료별 금액과 총 재료 원가가 바로 나옵니다.',
  },
  {
    title: '판매가격을 확인합니다',
    description: '판매가격을 넣으면 원가율이, 목표 원가율을 넣으면 적정 판매가격이 계산됩니다.',
  },
];

const FEATURES = [
  {
    emoji: '🧮',
    title: '메뉴 원가 계산',
    description: '재료별 사용량을 더해 메뉴 하나의 실제 재료 원가를 계산합니다.',
  },
  {
    emoji: '📊',
    title: '원가율 자동 계산',
    description: '재료 원가 ÷ 판매가격으로 원가율을 계산하고 높낮이를 색으로 알려줍니다.',
  },
  {
    emoji: '🏷️',
    title: '적정 판매가격 추천',
    description: '목표 원가율만 정하면 그에 맞는 판매가격을 바로 알려드립니다.',
  },
  {
    emoji: '🧺',
    title: '내 재료 관리',
    description: '자주 쓰는 식재료의 구매가격과 단위 원가를 저장해 두고 재사용합니다.',
  },
  {
    emoji: '🔄',
    title: '가격 변동 자동 반영',
    description: '식재료 가격을 수정하면 그 재료를 쓰는 모든 메뉴 원가가 자동으로 바뀝니다.',
  },
  {
    emoji: '📈',
    title: '원가 변동 관리',
    description: '지난 원가와 현재 원가를 비교해 얼마나 올랐는지 한눈에 보여줍니다.',
  },
];

export default function HomePage() {
  const rate = (PREVIEW.cost / PREVIEW.price) * 100;
  const margin = PREVIEW.price - PREVIEW.cost;

  return (
    <>
      <JsonLd data={webApplicationJsonLd()} />
      <JsonLd data={faqJsonLd()} />

      {/* Hero */}
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <Badge tone="brand">회원가입 없이 바로 계산</Badge>
            <h1 className="mt-4 text-[2rem] font-extrabold leading-[1.25] tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.2]">
              우리 가게 음식 원가,
              <br />
              무료로 계산하세요.
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-600">
              재료 가격과 사용량만 입력하면 메뉴 원가, 원가율, 적정 판매가격을 자동으로 계산해드립니다.
            </p>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <Link href="/calculator" className={buttonClass('primary', 'lg', 'w-full sm:w-auto')}>
                무료로 원가 계산하기
              </Link>
              <Link href="/guide" className={buttonClass('secondary', 'lg', 'w-full sm:w-auto')}>
                사용 방법 보기
              </Link>
            </div>
            <p className="mt-4 text-sm font-medium text-ink-500">
              기본 원가 계산은 무료입니다 · 복잡한 프로그램 설치가 필요 없습니다
            </p>
          </div>

          {/* 결과 미리보기 카드 */}
          <div className="relative">
            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-pop">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink-400">메뉴</p>
                  <p className="text-xl font-extrabold text-ink-900">{PREVIEW.name}</p>
                </div>
                <Badge tone="success">원가율 낮음</Badge>
              </div>

              <dl className="mt-5 flex flex-col divide-y divide-ink-100">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-[15px] text-ink-600">재료 원가</dt>
                  <dd className="tnum text-lg font-bold text-ink-900">{formatWon(PREVIEW.cost)}</dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-[15px] text-ink-600">판매가격</dt>
                  <dd className="tnum text-lg font-bold text-ink-900">{formatWon(PREVIEW.price)}</dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-[15px] text-ink-600">원가율</dt>
                  <dd className="tnum text-2xl font-extrabold text-emerald-600">
                    {formatPercent(rate)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-[15px] text-ink-600">예상 이익(재료비 제외)</dt>
                  <dd className="tnum text-lg font-bold text-ink-900">{formatWon(margin)}</dd>
                </div>
              </dl>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
              </div>
              <p className="mt-3 text-xs text-ink-400">
                실제 계산 화면과 동일한 결과 예시입니다. 인건비·임대료는 포함되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 계산 방법 */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          3단계면 원가 계산 끝
        </h2>
        <p className="mt-3 text-center text-[15px] text-ink-500">
          복잡한 회계 프로그램 없이, 사장님이 아는 숫자만 넣으면 됩니다.
        </p>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-card border border-ink-200 bg-white p-6 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-[15px] font-black text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 기능 */}
      <section className="border-y border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            식당 원가 관리에 필요한 기능만 담았습니다
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-600">
            음식점, 카페, 분식집, 베이커리처럼 메뉴가 자주 바뀌는 가게에서도 부담 없이 쓸 수 있도록
            꼭 필요한 기능만 골라 담았습니다.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-card border border-ink-200 bg-white p-6 shadow-card">
                <span className="text-2xl">{feature.emoji}</span>
                <h3 className="mt-3 text-[17px] font-bold text-ink-900">{feature.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 무료 강조 */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="rounded-card bg-ink-900 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            기본 원가 계산은 무료입니다
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-300">
            결제를 요구하지 않습니다. 회원가입 없이도 바로 계산할 수 있고, 재료와 메뉴를 저장하고 싶을 때만
            무료 회원가입을 하시면 됩니다.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Link href="/calculator" className={buttonClass('primary', 'lg', 'w-full sm:w-auto')}>
              원가 계산 시작
            </Link>
            <Link
              href="/login"
              className={buttonClass('secondary', 'lg', 'w-full border-transparent bg-white/10 text-white hover:bg-white/20 sm:w-auto')}
            >
              무료 회원가입
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          자주 묻는 질문
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="group rounded-card border border-ink-200 bg-white p-5 shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-bold text-ink-900">
                {item.question}
                <span className="text-ink-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
