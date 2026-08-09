'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, COST_RATE_TEXT } from '@/components/ui/Badge';
import { IconArrowDown, IconArrowUp, IconPlus } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { LoginGate } from '@/components/layout/LoginGate';
import { useAuth } from '@/lib/auth/auth';
import { useData } from '@/lib/store/data';
import { formatPercent, formatPercentDelta, formatWon, formatWonDelta, roundTo } from '@/lib/domain/money';

function StatCard({
  label,
  value,
  suffix,
  tone = 'text-ink-900',
  hint,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 shadow-card">
      <p className="text-sm font-semibold text-ink-500">{label}</p>
      <p className={`tnum mt-2 text-3xl font-extrabold ${tone}`}>
        {value}
        {suffix ? <span className="ml-0.5 text-lg font-bold">{suffix}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

export function DashboardClient() {
  const { user, ready: authReady } = useAuth();
  const { ingredients, menuViews, loadSampleData } = useData();
  const { showToast } = useToast();

  const stats = useMemo(() => {
    const rates = menuViews.map((v) => v.costRate).filter((r): r is number => r !== null);
    const averageRate = rates.length
      ? roundTo(rates.reduce((sum, r) => sum + r, 0) / rates.length, 1)
      : null;
    const rising = menuViews.filter((v) => v.change?.direction === 'up');
    return { averageRate, rising };
  }, [menuViews]);

  const topRateMenus = useMemo(
    () =>
      [...menuViews]
        .filter((v) => v.costRate !== null)
        .sort((a, b) => (b.costRate ?? 0) - (a.costRate ?? 0))
        .slice(0, 5),
    [menuViews],
  );

  const recentIngredients = useMemo(() => {
    return ingredients
      .map((ingredient) => {
        const history = ingredient.priceHistory ?? [];
        if (history.length < 2) return null;
        const current = history[history.length - 1];
        const previous = history[history.length - 2];
        if (!previous.unitCost) return null;
        const rate = roundTo(((current.unitCost - previous.unitCost) / previous.unitCost) * 100, 1);
        if (rate === 0) return null;
        return { ingredient, rate, at: current.at };
      })
      .filter((v): v is { ingredient: (typeof ingredients)[number]; rate: number; at: string } => v !== null)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 5);
  }, [ingredients]);

  if (!authReady) return null;
  if (!user) {
    return (
      <LoginGate
        title="대시보드는 로그인 후 볼 수 있어요"
        description="저장한 재료와 메뉴를 바탕으로 평균 원가율, 원가가 오른 메뉴를 한눈에 보여드립니다."
        next="/dashboard"
      />
    );
  }

  const isEmpty = ingredients.length === 0 && menuViews.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            {user.name}님의 원가 현황
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-500">
            저장한 재료와 메뉴를 바탕으로 계산한 요약입니다.
          </p>
        </div>
        <Link href="/calculator" className={buttonClass('primary', 'md')}>
          <IconPlus width={18} height={18} />
          새 메뉴 계산
        </Link>
      </div>

      {isEmpty ? (
        <div className="mt-6">
          <EmptyState
            icon="📊"
            title="아직 보여드릴 데이터가 없습니다"
            description="재료와 메뉴를 저장하면 평균 원가율, 원가가 오른 메뉴를 자동으로 정리해 드립니다."
            action={
              <>
                <Link href="/calculator" className={buttonClass('primary', 'md')}>
                  메뉴 원가 계산하기
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => {
                    loadSampleData();
                    showToast('예시 재료와 메뉴를 불러왔습니다.', 'success');
                  }}
                >
                  예시 데이터 불러오기
                </Button>
              </>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="저장된 재료" value={String(ingredients.length)} suffix="개" />
            <StatCard label="저장된 메뉴" value={String(menuViews.length)} suffix="개" />
            <StatCard
              label="평균 원가율"
              value={stats.averageRate === null ? '-' : formatPercent(stats.averageRate)}
              hint="판매가격이 입력된 메뉴 기준"
            />
            <StatCard
              label="원가 상승 메뉴"
              value={String(stats.rising.length)}
              suffix="개"
              tone={stats.rising.length > 0 ? 'text-red-600' : 'text-ink-900'}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardTitle description="판매가격 대비 재료비 비중이 높은 메뉴입니다.">
                원가율이 높은 메뉴
              </CardTitle>
              {topRateMenus.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-400">판매가격이 입력된 메뉴가 없습니다.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {topRateMenus.map((view, index) => (
                    <li key={view.menu.id}>
                      <Link
                        href={`/calculator/${view.menu.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-4 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50/50"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-sm font-bold text-ink-600">
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-ink-900">{view.menu.name}</span>
                            <span className="tnum block text-xs text-ink-500">
                              원가 {formatWon(view.cost)} · 판매 {formatWon(view.menu.sellingPrice)}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`tnum shrink-0 text-lg font-extrabold ${
                            view.level ? COST_RATE_TEXT[view.level.id] : 'text-ink-500'
                          }`}
                        >
                          {view.costRate === null ? '-' : formatPercent(view.costRate)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card>
              <CardTitle description="단위 원가가 바뀐 재료를 최근 순으로 보여줍니다.">
                최근 변경된 재료
              </CardTitle>
              {recentIngredients.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-400">가격이 변경된 재료가 아직 없습니다.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {recentIngredients.map(({ ingredient, rate }) => (
                    <li
                      key={ingredient.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-ink-900">{ingredient.name}</span>
                        <span className="tnum block text-xs text-ink-500">
                          {formatWon(ingredient.price)} / {ingredient.quantity}
                          {ingredient.unit}
                        </span>
                      </span>
                      <Badge tone={rate > 0 ? 'danger' : 'success'}>
                        {rate > 0 ? <IconArrowUp width={12} height={12} /> : <IconArrowDown width={12} height={12} />}
                        {formatPercentDelta(rate)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {stats.rising.length > 0 ? (
            <Card className="mt-5">
              <CardTitle description="재료 가격이 오르면서 원가가 함께 올라간 메뉴입니다.">
                원가가 오른 메뉴
              </CardTitle>
              <ul className="flex flex-col gap-2">
                {stats.rising.map((view) => (
                  <li
                    key={view.menu.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50/70 px-4 py-3"
                  >
                    <span className="font-bold text-ink-900">{view.menu.name}</span>
                    <span className="tnum text-sm font-bold text-red-600">
                      {formatWon(view.change!.previous)} → {formatWon(view.change!.current)}{' '}
                      ({formatWonDelta(view.change!.diff)}, {formatPercentDelta(view.change!.rate)})
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/ingredients" className={buttonClass('secondary', 'md')}>
              내 재료 관리
            </Link>
            <Link href="/menus" className={buttonClass('secondary', 'md')}>
              내 메뉴 관리
            </Link>
          </div>
        </>
      )}

      <p className="mt-8 text-xs leading-relaxed text-ink-400">
        원가율은 재료비만 반영한 값으로, 인건비·임대료·공과금 등은 포함되어 있지 않습니다. 업종과 매장 상황에
        따라 적정 수준은 달라질 수 있으니 참고용으로 활용해주세요.
      </p>
    </div>
  );
}
