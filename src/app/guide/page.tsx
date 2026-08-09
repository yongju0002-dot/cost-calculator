import Link from 'next/link';
import type { Metadata } from 'next';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { COST_RATE_LEVELS } from '@/lib/domain/cost';
import { formatWon } from '@/lib/domain/money';
import { FAQ_ITEMS, JsonLd, faqJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: '음식 원가 계산 방법 - 원가율과 적정 판매가격 구하는 법',
  description:
    '음식점·카페에서 메뉴 원가와 원가율을 계산하는 방법을 예시와 함께 설명합니다. 단위 원가 계산, 원가율 공식, 목표 원가율에 맞는 적정 판매가격 구하는 법까지 알려드립니다.',
  alternates: { canonical: '/guide' },
};

const EXAMPLE_ROWS = [
  { name: '돼지고기', purchase: '45,000원 / 5kg', unitCost: '9원/g', amount: '200g', cost: 1800 },
  { name: '양파', purchase: '3,000원 / 2kg', unitCost: '1.5원/g', amount: '100g', cost: 150 },
  { name: '고추장', purchase: '30,000원 / 3kg', unitCost: '10원/g', amount: '30g', cost: 300 },
  { name: '고춧가루', purchase: '15,000원 / 1kg', unitCost: '15원/g', amount: '10g', cost: 150 },
  { name: '설탕', purchase: '6,000원 / 3kg', unitCost: '2원/g', amount: '10g', cost: 20 },
  { name: '기타 양념·부재료', purchase: '-', unitCost: '-', amount: '-', cost: 500 },
];

const MISTAKES = [
  {
    title: '구매 단위와 사용 단위를 섞어서 계산합니다',
    description:
      '5kg에 45,000원인 고기를 200g 사용했다면 45,000 ÷ 5,000g = 9원/g 을 먼저 구한 뒤 200을 곱해야 합니다. 원가계산기는 kg↔g, L↔ml 환산을 자동으로 처리합니다.',
  },
  {
    title: '양념·포장재를 빼놓습니다',
    description:
      '소량이라 계산이 어려운 양념, 포장용기, 일회용품은 "기타 비용"으로 한 줄에 묶어서 넣어두면 원가가 훨씬 정확해집니다.',
  },
  {
    title: '재료비만 보고 이익이라고 생각합니다',
    description:
      '판매가격에서 재료비를 뺀 금액에는 인건비, 임대료, 공과금, 카드 수수료가 아직 포함되어 있지 않습니다. 재료비 제외 금액과 실제 이익은 다릅니다.',
  },
  {
    title: '가격이 올라도 원가를 다시 계산하지 않습니다',
    description:
      '식자재 가격은 자주 바뀝니다. 내 재료에 저장해 두면 가격만 수정해도 그 재료를 쓰는 모든 메뉴 원가가 자동으로 다시 계산됩니다.',
  },
];

export default function GuidePage() {
  const total = EXAMPLE_ROWS.reduce((sum, row) => sum + row.cost, 0);
  const price = 12000;
  const rate = ((total / price) * 100).toFixed(1);

  return (
    <>
      <JsonLd data={faqJsonLd()} />

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
        <p className="text-sm font-bold text-brand-600">사용 방법</p>
        <h1 className="mt-2 text-[2rem] font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl">
          음식 원가와 원가율,
          <br />
          이렇게 계산합니다
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-600">
          계산 방법 자체는 어렵지 않습니다. 재료 하나의 단위 원가를 구하고, 메뉴에 들어가는 만큼 곱해서
          더하면 됩니다. 아래 순서대로만 따라 하시면 됩니다.
        </p>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
            1단계. 재료의 단위 원가 구하기
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
            구매가격을 구매수량으로 나누면 1g(또는 1ml, 1개)당 가격이 나옵니다.
          </p>
          <Card className="mt-4 bg-ink-50/60">
            <p className="text-center text-[17px] font-bold text-ink-800">
              단위 원가 = 구매가격 ÷ 구매수량
            </p>
            <p className="tnum mt-3 text-center text-[15px] text-ink-600">
              45,000원 ÷ 5,000g = <b className="text-brand-600">9원/g</b>
            </p>
          </Card>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
            2단계. 사용량을 곱해서 메뉴 원가 구하기
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
            메뉴 1인분에 들어가는 양을 곱한 뒤 모두 더합니다. 제육볶음을 예로 들면 이렇습니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[15px]">
              <thead>
                <tr className="border-b border-ink-200 text-left text-sm text-ink-500">
                  <th className="py-2.5 pr-3 font-semibold">재료</th>
                  <th className="py-2.5 pr-3 font-semibold">구매</th>
                  <th className="py-2.5 pr-3 font-semibold">단위 원가</th>
                  <th className="py-2.5 pr-3 font-semibold">사용량</th>
                  <th className="py-2.5 text-right font-semibold">금액</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-ink-100">
                    <td className="py-2.5 pr-3 font-semibold text-ink-800">{row.name}</td>
                    <td className="tnum py-2.5 pr-3 text-ink-600">{row.purchase}</td>
                    <td className="tnum py-2.5 pr-3 text-ink-600">{row.unitCost}</td>
                    <td className="tnum py-2.5 pr-3 text-ink-600">{row.amount}</td>
                    <td className="tnum py-2.5 text-right font-bold text-ink-900">
                      {formatWon(row.cost)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 font-extrabold text-ink-900" colSpan={4}>
                    총 재료 원가
                  </td>
                  <td className="tnum py-3 text-right text-lg font-extrabold text-brand-600">
                    {formatWon(total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">3단계. 원가율 확인하기</h2>
          <Card className="mt-4 bg-ink-50/60">
            <p className="text-center text-[17px] font-bold text-ink-800">
              원가율(%) = 재료 원가 ÷ 판매가격 × 100
            </p>
            <p className="tnum mt-3 text-center text-[15px] text-ink-600">
              {formatWon(total)} ÷ {formatWon(price)} × 100 ={' '}
              <b className="text-brand-600">{rate}%</b>
            </p>
          </Card>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {COST_RATE_LEVELS.map((level, index) => {
              const min = index === 0 ? 0 : COST_RATE_LEVELS[index - 1].max;
              return (
                <div key={level.id} className="rounded-xl border border-ink-200 px-4 py-3">
                  <p className="font-bold text-ink-900">
                    {level.label}
                    <span className="tnum ml-2 text-sm font-semibold text-ink-500">
                      {Number.isFinite(level.max) ? `${min}~${level.max}%` : `${min}% 이상`}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-ink-500">{level.description}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            이 기준은 참고용입니다. 배달 비중이 높은 매장, 고급 식재료를 쓰는 매장, 회전율이 높은 분식집은
            적정 원가율이 서로 다릅니다.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
            4단계. 적정 판매가격 정하기
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
            반대로 목표 원가율을 먼저 정하면 판매가격을 역산할 수 있습니다.
          </p>
          <Card className="mt-4 bg-ink-50/60">
            <p className="text-center text-[17px] font-bold text-ink-800">
              적정 판매가격 = 재료 원가 ÷ 목표 원가율
            </p>
            <p className="tnum mt-3 text-center text-[15px] text-ink-600">
              3,000원 ÷ 30% = <b className="text-brand-600">10,000원</b>
            </p>
          </Card>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
            원가 계산할 때 자주 하는 실수
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {MISTAKES.map((mistake) => (
              <div key={mistake.title} className="rounded-card border border-ink-200 bg-white p-5 shadow-card">
                <h3 className="text-[17px] font-bold text-ink-900">{mistake.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{mistake.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">자주 묻는 질문</h2>
          <div className="mt-4 flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="group rounded-card border border-ink-200 bg-white p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink-900">
                  {item.question}
                  <span className="text-ink-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12 rounded-card bg-brand-50 px-6 py-10 text-center">
          <h2 className="text-xl font-extrabold text-ink-900">이제 직접 계산해보세요</h2>
          <p className="mt-2 text-[15px] text-ink-600">
            회원가입 없이도 바로 계산할 수 있습니다. 기본 원가 계산은 무료입니다.
          </p>
          <Link href="/calculator" className={buttonClass('primary', 'lg', 'mt-6')}>
            무료로 원가 계산하기
          </Link>
        </div>
      </div>
    </>
  );
}
