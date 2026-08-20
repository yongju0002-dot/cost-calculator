'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { NumberField, SelectField, TextField } from '@/components/ui/Field';
import { IconEdit, IconPlus, IconTrash } from '@/components/ui/Icons';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SyncStatus } from '@/components/layout/SyncStatus';
import {
  breakevenSummary,
  fixedCostByCategory,
  menuBreakeven,
  totalFixedCost,
} from '@/lib/domain/breakeven';
import {
  applyThousandSeparator,
  formatNumber,
  formatPercent,
  formatWon,
  parseNumberInput,
} from '@/lib/domain/money';
import { FIXED_COST_CATEGORIES, type FixedCost, type FixedCostCategory } from '@/lib/domain/types';
import { useData, type FixedCostInput } from '@/lib/store/data';

/**
 * 손익분기점 화면.
 *
 * 메뉴 원가(재료비)만으로는 "이 메뉴가 남는 장사인지"까지밖에 알 수 없다. 임대료·인건비
 * 처럼 파는 양과 무관하게 매달 나가는 돈을 넣어야 "그래서 얼마를 팔아야 본전인지"가
 * 나온다. 고정비는 여기서만 쓰고 메뉴 원가율에는 절대 섞지 않는다.
 */

interface FormState {
  name: string;
  amount: string;
  category: FixedCostCategory;
  memo: string;
}

const EMPTY_FORM: FormState = { name: '', amount: '', category: '임대료', memo: '' };

/** 처음 쓰는 사장님이 뭘 넣어야 할지 감을 잡도록 흔한 항목을 미리 제안한다. */
const PRESETS: { name: string; category: FixedCostCategory }[] = [
  { name: '임대료', category: '임대료' },
  { name: '직원 급여', category: '인건비' },
  { name: '아르바이트 급여', category: '인건비' },
  { name: '전기·가스·수도', category: '공과금' },
  { name: '통신비', category: '공과금' },
  { name: '보험료', category: '기타' },
];

const CATEGORY_TONE: Record<FixedCostCategory, string> = {
  임대료: 'bg-amber-50 text-amber-700',
  인건비: 'bg-sky-50 text-sky-700',
  공과금: 'bg-violet-50 text-violet-700',
  기타: 'bg-ink-100 text-ink-600',
};

function toFormState(cost: FixedCost): FormState {
  return {
    name: cost.name,
    amount: applyThousandSeparator(String(cost.amount)),
    category: cost.category,
    memo: cost.memo ?? '',
  };
}

function StatCard({
  label,
  value,
  suffix,
  hint,
  tone = 'text-ink-900',
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 shadow-card">
      <p className="text-sm font-semibold text-ink-500">{label}</p>
      <p className={`tnum mt-2 text-2xl font-extrabold sm:text-3xl ${tone}`}>
        {value}
        {suffix ? <span className="ml-0.5 text-lg font-bold">{suffix}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

export function BreakevenClient() {
  const {
    ready,
    menuViews,
    fixedCosts,
    operatingDays,
    addFixedCost,
    updateFixedCost,
    removeFixedCost,
    setOperatingDays,
  } = useData();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FixedCost | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<FixedCost | null>(null);
  /**
   * 영업일수 입력 중인 값. null 이면 "입력 중이 아님" 이라 저장된 값을 그대로 보여준다.
   *
   * 처음부터 useState(String(operatingDays)) 로 두면 안 된다 — 저장소를 아직 읽기 전에
   * 초기값이 고정돼서, 저장된 값이 25 인데 입력칸에는 기본값 26 이 남는다.
   */
  const [daysDraft, setDaysDraft] = useState<string | null>(null);
  const daysText = daysDraft ?? String(operatingDays);

  const fixedTotal = useMemo(() => totalFixedCost(fixedCosts), [fixedCosts]);
  const byCategory = useMemo(() => fixedCostByCategory(fixedCosts), [fixedCosts]);

  const summary = useMemo(
    () =>
      breakevenSummary(
        menuViews.map((v) => ({ sellingPrice: v.menu.sellingPrice, cost: v.cost })),
        fixedTotal,
        operatingDays,
      ),
    [menuViews, fixedTotal, operatingDays],
  );

  const menuRows = useMemo(
    () =>
      menuViews
        .map((v) =>
          menuBreakeven(
            { menuId: v.menu.id, name: v.menu.name, sellingPrice: v.menu.sellingPrice, cost: v.cost },
            fixedTotal,
            operatingDays,
          ),
        )
        // 판매가가 없으면 계산이 안 되므로 뒤로 보내고, 나머지는 적게 팔아도 되는 순서로.
        .sort((a, b) => {
          if (a.monthlyUnits === null && b.monthlyUnits === null) return 0;
          if (a.monthlyUnits === null) return 1;
          if (b.monthlyUnits === null) return -1;
          return a.monthlyUnits - b.monthlyUnits;
        }),
    [menuViews, fixedTotal, operatingDays],
  );

  const losingCount = menuRows.filter((r) => r.losing).length;

  const openAdd = (preset?: { name: string; category: FixedCostCategory }) => {
    setEditing(null);
    setForm(preset ? { ...EMPTY_FORM, name: preset.name, category: preset.category } : EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (cost: FixedCost) => {
    setEditing(cost);
    setForm(toFormState(cost));
    setError(null);
    setFormOpen(true);
  };

  const submit = () => {
    const name = form.name.trim();
    if (!name) {
      setError('항목 이름을 입력해주세요.');
      return;
    }
    const amount = parseNumberInput(form.amount);
    if (amount === null || amount < 0) {
      setError('금액을 숫자로 입력해주세요.');
      return;
    }

    const input: FixedCostInput = { name, amount, category: form.category, memo: form.memo };
    if (editing) {
      updateFixedCost(editing.id, input);
      showToast('고정비를 수정했습니다.', 'success');
    } else {
      addFixedCost(input);
      showToast('고정비를 추가했습니다.', 'success');
    }
    setFormOpen(false);
  };

  const commitDays = () => {
    if (daysDraft !== null) {
      const parsed = parseNumberInput(daysDraft);
      // 저장소가 범위(1~31)를 보정하므로 값만 넘기면 된다. 숫자가 아니면 그냥 되돌린다.
      if (parsed !== null) setOperatingDays(parsed);
    }
    // 입력을 끝냈으니 저장된 값을 그대로 따라가게 한다.
    setDaysDraft(null);
  };

  if (!ready) return null;

  const hasFixedCosts = fixedCosts.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <SyncStatus />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            손익분기점
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-500">
            매달 나가는 고정비를 넣으면, 얼마를 팔아야 본전인지 계산해 드립니다.
          </p>
        </div>
        {hasFixedCosts ? (
          <Button onClick={() => openAdd()}>
            <IconPlus width={18} height={18} />
            고정비 추가
          </Button>
        ) : null}
      </div>

      {!hasFixedCosts ? (
        <div className="mt-6">
          <EmptyState
            icon="🧾"
            title="매달 고정으로 나가는 비용을 넣어주세요"
            description="임대료, 인건비, 공과금처럼 손님이 오든 안 오든 나가는 돈입니다. 이걸 넣어야 '얼마를 팔아야 본전인지'가 나옵니다."
            action={
              <Button onClick={() => openAdd()}>
                <IconPlus width={18} height={18} />
                고정비 추가
              </Button>
            }
          />
          <Card className="mt-4">
            <CardTitle description="자주 쓰는 항목입니다. 눌러서 금액만 채우면 됩니다.">
              이런 것들이 고정비예요
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => openAdd(preset)}
                  className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50/50"
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="한 달 고정비" value={formatWon(fixedTotal)} />
            <StatCard
              label="평균 공헌이익률"
              value={summary.averageMarginRate === null ? '-' : formatPercent(summary.averageMarginRate)}
              hint={
                summary.menuCount > 0
                  ? `메뉴 ${summary.menuCount}개 기준${
                      summary.excludedCount > 0 ? ` (적자 ${summary.excludedCount}개 제외)` : ''
                    }`
                  : '판매가가 입력된 메뉴가 없습니다'
              }
            />
            <StatCard
              label="한 달 본전 매출"
              value={summary.monthlyRevenue === null ? '-' : formatWon(summary.monthlyRevenue)}
              tone="text-brand-600"
            />
            <StatCard
              label="하루 본전 매출"
              value={summary.dailyRevenue === null ? '-' : formatWon(summary.dailyRevenue)}
              tone="text-brand-600"
              hint={`한 달 ${summary.operatingDays}일 영업 기준`}
            />
          </div>

          {summary.monthlyRevenue === null ? (
            <Card className="mt-4 border-amber-200 bg-amber-50/60">
              <p className="text-[15px] font-bold text-ink-900">
                {summary.excludedCount > 0
                  ? '지금 구조로는 본전을 맞출 수 없습니다'
                  : '아직 본전 매출을 계산할 수 없습니다'}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                {summary.excludedCount > 0 ? (
                  '저장된 메뉴가 모두 판매가격보다 재료비가 높습니다. 팔수록 손해라 아무리 많이 팔아도 고정비를 갚을 수 없습니다. 판매가를 올리거나 재료비를 낮춰야 합니다.'
                ) : (
                  <>
                    메뉴에 판매가격이 입력되어 있어야 계산할 수 있습니다.{' '}
                    <Link href="/menus" className="font-semibold text-brand-600 hover:underline">
                      내 메뉴에서 판매가격 입력하기
                    </Link>
                  </>
                )}
              </p>
            </Card>
          ) : null}

          <div className="mt-5 grid gap-5 lg:grid-cols-5">
            {/* 고정비 목록 */}
            <Card className="lg:col-span-2">
              <CardTitle description="매달 고정으로 나가는 돈입니다.">고정비 항목</CardTitle>
              <ul className="flex flex-col divide-y divide-ink-100">
                {fixedCosts.map((cost) => (
                  <li key={cost.id} className="flex items-center gap-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
                        <span className="truncate">{cost.name}</span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${CATEGORY_TONE[cost.category]}`}
                        >
                          {cost.category}
                        </span>
                      </p>
                      {cost.memo ? (
                        <p className="mt-0.5 truncate text-xs text-ink-500">{cost.memo}</p>
                      ) : null}
                    </div>
                    <span className="tnum shrink-0 text-[15px] font-extrabold text-ink-900">
                      {formatWon(cost.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(cost)}
                      aria-label={`${cost.name} 수정`}
                      className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                    >
                      <IconEdit width={16} height={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(cost)}
                      aria-label={`${cost.name} 삭제`}
                      className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3">
                <span className="text-sm font-bold text-ink-700">합계</span>
                <span className="tnum text-lg font-extrabold text-ink-900">{formatWon(fixedTotal)}</span>
              </div>

              {byCategory.size > 1 ? (
                <ul className="mt-3 flex flex-col gap-1">
                  {[...byCategory.entries()].map(([category, amount]) => (
                    <li key={category} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink-500">{category}</span>
                      <span className="tnum font-semibold text-ink-600">
                        {formatWon(amount)}
                        <span className="ml-1 text-ink-400">
                          ({formatPercent((amount / fixedTotal) * 100, 0)})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 border-t border-ink-100 pt-4">
                <NumberField
                  label="한 달 영업일수"
                  value={daysText}
                  onValueChange={setDaysDraft}
                  onBlur={commitDays}
                  separator={false}
                  suffix="일"
                  hint="하루 목표 매출을 나눌 때 씁니다."
                  fieldClassName="max-w-[10rem]"
                />
              </div>
            </Card>

            {/* 메뉴별 필요 판매량 */}
            <Card className="lg:col-span-3">
              <CardTitle description="이 메뉴 하나만 판다고 가정했을 때, 고정비를 갚으려면 몇 개를 팔아야 하는지입니다.">
                메뉴별 필요 판매량
              </CardTitle>

              {menuRows.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[15px] text-ink-500">저장된 메뉴가 없습니다.</p>
                  <Link href="/calculator" className={buttonClass('secondary', 'md', 'mt-4')}>
                    메뉴 원가 계산하기
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-ink-100">
                  {menuRows.map((row) => (
                    <li key={row.menuId} className="py-3">
                      <Link
                        href={`/calculator/${row.menuId}`}
                        className="flex items-center justify-between gap-3 transition-colors hover:text-brand-600"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-bold text-ink-900">{row.name}</p>
                          <p className="tnum mt-0.5 text-xs text-ink-500">
                            {row.sellingPrice > 0 ? (
                              <>
                                판매 {formatWon(row.sellingPrice)} · 원가 {formatWon(row.cost)} ·{' '}
                                <span className="font-semibold">
                                  개당 {formatWon(row.margin ?? 0)} 남음
                                </span>
                              </>
                            ) : (
                              '판매가격이 입력되지 않았습니다'
                            )}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {row.monthlyUnits === null ? (
                            <span className="text-xs font-bold text-amber-600">
                              {row.losing ? '팔수록 손해' : '계산 불가'}
                            </span>
                          ) : (
                            <>
                              <p className="tnum text-lg font-extrabold text-ink-900">
                                {formatNumber(row.dailyUnits ?? 0)}
                                <span className="ml-0.5 text-xs font-bold text-ink-500">개/일</span>
                              </p>
                              <p className="tnum text-xs text-ink-400">
                                월 {formatNumber(row.monthlyUnits)}개
                              </p>
                            </>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {losingCount > 0 ? (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  판매가격이 재료비보다 낮은 메뉴가 {losingCount}개 있습니다. 팔수록 손해라 고정비를
                  갚는 데 보탬이 되지 않습니다.
                </p>
              ) : null}
            </Card>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/menus" className={buttonClass('secondary', 'md')}>
              내 메뉴 관리
            </Link>
            <Link href="/dashboard" className={buttonClass('secondary', 'md')}>
              원가 현황 보기
            </Link>
          </div>
        </>
      )}

      <p className="mt-8 break-keep text-xs leading-relaxed text-ink-400">
        공헌이익(판매가 − 재료비)으로 한 달 고정비를 나눠 계산한 값입니다. 카드 수수료·배달
        수수료처럼 팔 때마다 나가는 비용은 아직 반영되지 않아, 실제 본전 지점은 이 계산보다 조금 높을
        수 있습니다. 세금은 포함되어 있지 않습니다. 참고용으로 활용해주세요.
      </p>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? '고정비 수정' : '고정비 추가'}
        description="매달 고정으로 나가는 금액을 넣어주세요."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              취소
            </Button>
            <Button onClick={submit}>{editing ? '수정' : '추가'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="항목 이름"
            placeholder="예: 임대료, 직원 급여"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            error={error && !form.name.trim() ? error : null}
          />
          <NumberField
            label="한 달 금액"
            placeholder="0"
            suffix="원"
            value={form.amount}
            onValueChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            error={error && form.name.trim() ? error : null}
          />
          <SelectField
            label="분류"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value as FixedCostCategory }))
            }
          >
            {FIXED_COST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <TextField
            label="메모 (선택)"
            placeholder="예: 2년 계약, 매월 25일 이체"
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="고정비를 삭제할까요?"
        message={
          <>
            <strong>{deleting?.name}</strong> ({formatWon(deleting?.amount ?? 0)}) 항목을 삭제합니다.
            손익분기 계산에서 제외됩니다.
          </>
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            removeFixedCost(deleting.id);
            showToast('고정비를 삭제했습니다.', 'success');
          }
          setDeleting(null);
        }}
      />
    </div>
  );
}
