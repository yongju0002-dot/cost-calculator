'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { NumberField, SelectField, TextField } from '@/components/ui/Field';
import { Badge, COST_RATE_BAR, COST_RATE_TEXT, COST_RATE_TONE } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { IconBolt, IconInfo, IconPlus } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/auth';
import { useData } from '@/lib/store/data';
import {
  computeCostBreakdown,
  computeCostRate,
  computeMarginAmount,
  computePrepCost,
  computeRecipeCost,
  computeSuggestedPrice,
  costRateLevel,
} from '@/lib/domain/cost';
import { applyThousandSeparator, formatPercent, formatWon, parseNumberInput } from '@/lib/domain/money';
import { limitReachedMessage } from '@/lib/domain/limits';
import { setDraft, resetDraft, restorePersistedDraft, useDraft } from '@/lib/store/draftStore';
import type { Ingredient } from '@/lib/domain/types';
import {
  createIngredientRow,
  createManualRow,
  draftFromMenu,
  hasUsableRow,
  isRowEmpty,
  rowFromIngredient,
  rowFromPrep,
  rowFromSupply,
  toRecipeItems,
  validateRow,
  type Draft,
  type DraftItem,
} from './draft';
import { RecipeRow } from './RecipeRow';
import { IngredientPicker } from './IngredientPicker';
import { PrepPicker, SupplyPicker } from './PrepSupplyPicker';

/**
 * menuId 가 있으면 저장된 메뉴를 수정하는 화면이 된다. (/calculator/[menuId])
 *
 * 수정할 메뉴는 쿼리스트링(?menu=)이 아니라 경로로 받는다.
 * useSearchParams() 를 쓰면 이 화면을 <Suspense> 로 감싸야 하는데,
 * 그 조합에서 첫 진입 시 화면이 fallback 에 머무는 문제가 있었다.
 */
export function CostCalculator({ menuId }: { menuId?: string }) {
  const router = useRouter();
  const menuIdParam = menuId ?? null;
  const { user } = useAuth();
  const {
    ready,
    ingredients,
    ingredientMap,
    preps,
    supplies,
    menus,
    menuViews,
    categories,
    limits,
    addMenu,
    updateMenu,
    addCategory,
  } = useData();
  const { showToast } = useToast();

  const draft = useDraft();
  const [showErrors, setShowErrors] = useState(false);
  const [pickerRowId, setPickerRowId] = useState<string | null>(null);
  const [prepPickerOpen, setPrepPickerOpen] = useState(false);
  const [supplyPickerOpen, setSupplyPickerOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const initializedFor = useRef<string | null>(null);

  // 편집 모드면 저장된 메뉴를, 아니면 임시 저장된 입력값을 불러온다.
  // (React 상태가 아니라 외부 스토어를 갱신하므로 렌더가 연쇄되지 않는다.)
  useEffect(() => {
    if (!ready) return;
    const key = menuIdParam ?? 'new';
    if (initializedFor.current === key) return;

    if (menuIdParam) {
      const view = menuViews.find((v) => v.menu.id === menuIdParam);
      if (!view) return;
      setDraft(draftFromMenu(view.menu, view.items));
      initializedFor.current = key;
      return;
    }

    if (initializedFor.current !== null) restorePersistedDraft();
    initializedFor.current = key;
  }, [ready, menuIdParam, menuViews]);

  const items = useMemo(() => toRecipeItems(draft.items), [draft.items]);
  const cost = useMemo(() => computeRecipeCost(items), [items]);
  const breakdown = useMemo(() => computeCostBreakdown(items), [items]);
  const sellingPrice = parseNumberInput(draft.sellingPrice) ?? 0;
  const costRate = computeCostRate(cost, sellingPrice);
  const level = costRateLevel(costRate);
  const margin = computeMarginAmount(cost, sellingPrice);
  const targetRate = parseNumberInput(draft.targetRate) ?? 0;
  const suggested = computeSuggestedPrice(cost, targetRate);
  const editingMenu = menuIdParam ? menus.find((m) => m.id === menuIdParam) : undefined;

  const patch = useCallback((changes: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...changes }));
  }, []);

  const updateRow = useCallback((row: DraftItem) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === row.id ? row : item)),
    }));
  }, []);

  const removeRow = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.length <= 1 ? [createIngredientRow()] : prev.items.filter((i) => i.id !== id),
    }));
  }, []);

  const handlePick = useCallback(
    (ingredient: Ingredient) => {
      setDraft((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === pickerRowId ? rowFromIngredient(ingredient, item) : item,
        ),
      }));
    },
    [pickerRowId],
  );

  const applySuggestedPrice = () => {
    if (!suggested) return;
    patch({ sellingPrice: applyThousandSeparator(String(suggested.recommended)) });
    showToast(`추천 판매가격 ${formatWon(suggested.recommended)}을 적용했습니다.`, 'success');
  };

  const handleReset = () => {
    resetDraft();
    setShowErrors(false);
    setResetOpen(false);
    if (menuIdParam) router.push('/calculator');
    showToast('새로운 계산을 시작합니다.');
  };

  const handleSave = () => {
    const filled = draft.items.filter((row) => !isRowEmpty(row));
    const invalid = filled.some((row) => validateRow(row).length > 0);

    if (!draft.name.trim()) {
      setShowErrors(true);
      showToast('메뉴명을 입력해주세요.', 'warning');
      return;
    }
    if (filled.length === 0 || !hasUsableRow(draft.items)) {
      setShowErrors(true);
      showToast('재료를 1개 이상 입력해주세요.', 'warning');
      return;
    }
    if (invalid) {
      setShowErrors(true);
      showToast('입력하지 않은 항목이 있습니다. 빨간색 안내를 확인해주세요.', 'warning');
      return;
    }
    if (!user) {
      // 입력한 내용은 임시 저장되어 있으므로 로그인 후 그대로 이어서 저장할 수 있다.
      showToast('메뉴를 저장하려면 로그인이 필요합니다. 입력한 내용은 그대로 보관됩니다.', 'info');
      router.push('/login?next=/calculator');
      return;
    }

    const payload = {
      name: draft.name,
      category: draft.category,
      items: toRecipeItems(filled),
      sellingPrice,
    };

    if (menuIdParam && editingMenu) {
      updateMenu(menuIdParam, payload);
      showToast(`'${draft.name}' 메뉴를 수정했습니다.`, 'success');
    } else {
      const created = addMenu(payload);
      if (!created) {
        showToast(limitReachedMessage('menus'), 'warning');
        return;
      }
      resetDraft();
      showToast(`'${draft.name}' 메뉴를 저장했습니다.`, 'success');
    }
    router.push('/menus');
  };

  const rateWidth = costRate === null ? 0 : Math.min(100, Math.max(0, costRate));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          {editingMenu ? '메뉴 원가 수정' : '음식 원가 계산기'}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-500">
          재료 가격과 사용량만 입력하면 원가·원가율·적정 판매가격이 실시간으로 계산됩니다.
          {user ? '' : ' 회원가입 없이도 바로 계산할 수 있습니다.'}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardTitle description="어떤 메뉴의 원가를 계산할지 적어주세요.">메뉴 정보</CardTitle>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <TextField
                label="메뉴명"
                placeholder="예) 제육볶음"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                error={showErrors && !draft.name.trim() ? '메뉴명을 입력해주세요.' : null}
              />
              <SelectField
                label="카테고리"
                value={draft.category}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setCategoryOpen(true);
                    return;
                  }
                  patch({ category: e.target.value });
                }}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="__new__">+ 카테고리 직접 추가</option>
              </SelectField>
            </div>
            {categoryOpen ? (
              <div className="mt-3 flex items-end gap-2">
                <TextField
                  label="새 카테고리"
                  placeholder="예) 야식"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  fieldClassName="flex-1"
                />
                <Button
                  onClick={() => {
                    const name = newCategory.trim();
                    if (!name) return;
                    addCategory(name);
                    patch({ category: name });
                    setNewCategory('');
                    setCategoryOpen(false);
                    showToast(`'${name}' 카테고리를 추가했습니다.`, 'success');
                  }}
                >
                  추가
                </Button>
                <Button variant="secondary" onClick={() => setCategoryOpen(false)}>
                  취소
                </Button>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardTitle description="구매가격과 구매수량을 넣으면 단위 원가가 자동으로 계산됩니다.">
              재료 입력
            </CardTitle>

            <ul className="flex flex-col gap-3">
              {draft.items.map((row, index) => (
                <RecipeRow
                  key={row.id}
                  row={row}
                  index={index}
                  showErrors={showErrors && !isRowEmpty(row)}
                  canPickIngredient={Boolean(user) && ingredients.length > 0}
                  onChange={updateRow}
                  onRemove={() => removeRow(row.id)}
                  onPickIngredient={() => setPickerRowId(row.id)}
                />
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="soft"
                onClick={() => setDraft((prev) => ({ ...prev, items: [...prev.items, createIngredientRow()] }))}
              >
                <IconPlus width={18} height={18} />
                재료 추가
              </Button>
              {user ? (
                <>
                  <Button variant="secondary" onClick={() => setPrepPickerOpen(true)}>
                    <IconPlus width={18} height={18} />
                    프렙 추가
                  </Button>
                  <Button variant="secondary" onClick={() => setSupplyPickerOpen(true)}>
                    <IconPlus width={18} height={18} />
                    부자재 추가
                  </Button>
                </>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => setDraft((prev) => ({ ...prev, items: [...prev.items, createManualRow()] }))}
              >
                <IconPlus width={18} height={18} />
                기타 비용 추가
              </Button>
            </div>

            {/* 원가가 여러 종류로 구성된 경우에만 구성을 보여준다. */}
            {[breakdown.ingredient, breakdown.prep, breakdown.supply, breakdown.manual].filter(
              (value) => value > 0,
            ).length > 1 ? (
              <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ['식재료', breakdown.ingredient],
                    ['프렙', breakdown.prep],
                    ['부자재', breakdown.supply],
                    ['기타', breakdown.manual],
                  ] as const
                )
                  .filter(([, value]) => value > 0)
                  .map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-ink-50 px-3 py-2.5">
                      <dt className="text-xs font-semibold text-ink-500">{label}</dt>
                      <dd className="tnum mt-0.5 text-[15px] font-bold text-ink-900">
                        {formatWon(value)}
                      </dd>
                    </div>
                  ))}
              </dl>
            ) : null}

            <div className="mt-5 flex items-center justify-between rounded-xl bg-ink-900 px-5 py-4 text-white">
              <span className="text-[15px] font-semibold">총 원가</span>
              <span className="tnum text-2xl font-extrabold">{formatWon(cost)}</span>
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:h-fit">
          <Card>
            <CardTitle description="판매가격을 넣으면 원가율이 계산됩니다.">판매가격 · 원가율</CardTitle>
            <NumberField
              label="판매가격"
              suffix="원"
              placeholder="0"
              value={draft.sellingPrice}
              onValueChange={(raw) => patch({ sellingPrice: raw })}
            />

            <div className="mt-5 rounded-xl border border-ink-200 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-ink-600">원가율</span>
                {level ? <Badge tone={COST_RATE_TONE[level.id]}>{level.label}</Badge> : null}
              </div>
              <p
                className={`tnum mt-1 text-4xl font-extrabold ${
                  level ? COST_RATE_TEXT[level.id] : 'text-ink-300'
                }`}
              >
                {costRate === null ? '-' : formatPercent(costRate)}
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className={`h-full rounded-full transition-[width] ${
                    level ? COST_RATE_BAR[level.id] : 'bg-ink-200'
                  }`}
                  style={{ width: `${rateWidth}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-ink-500">
                {level ? level.description : '판매가격을 입력하면 원가율을 알려드립니다.'}
              </p>
            </div>

            <dl className="mt-4 flex flex-col gap-2 text-[15px]">
              <div className="flex items-center justify-between">
                <dt className="text-ink-600">재료 원가</dt>
                <dd className="tnum font-bold text-ink-900">{formatWon(cost)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-600">재료비 제외 금액</dt>
                <dd className="tnum font-bold text-ink-900">
                  {margin === null ? '-' : formatWon(margin)}
                </dd>
              </div>
            </dl>

            <p className="mt-4 flex gap-2 rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-500">
              <IconInfo width={16} height={16} className="mt-0.5 shrink-0" />
              <span>
                원가율 기준(낮음 30% 미만 · 보통 30~40% · 높음 40~50% · 매우 높음 50% 이상)은 참고용이며
                실제 적정 수준은 업종과 매장 상황에 따라 다릅니다. 재료비 제외 금액에는 인건비·임대료·공과금이
                포함되어 있지 않습니다.
              </span>
            </p>
          </Card>

          <Card>
            <CardTitle description="목표 원가율에 맞는 판매가격을 알려드립니다.">적정 판매가격</CardTitle>
            <NumberField
              label="목표 원가율"
              suffix="%"
              placeholder="30"
              value={draft.targetRate}
              onValueChange={(raw) => patch({ targetRate: raw })}
              separator={false}
            />
            <div className="mt-4 rounded-xl bg-brand-50 p-4">
              <p className="text-sm font-semibold text-brand-700">추천 판매가격</p>
              <p className="tnum mt-1 text-3xl font-extrabold text-brand-700">
                {suggested ? formatWon(suggested.recommended) : '-'}
              </p>
              {suggested ? (
                <p className="tnum mt-1 text-sm text-brand-600">
                  재료 원가 {formatWon(cost)} ÷ 목표 원가율 {formatPercent(targetRate, 0)} ={' '}
                  {formatWon(suggested.exact)} (100원 단위 올림)
                </p>
              ) : (
                <p className="mt-1 text-sm text-brand-600">재료와 목표 원가율을 입력해주세요.</p>
              )}
            </div>
            <Button
              variant="soft"
              className="mt-3 w-full"
              onClick={applySuggestedPrice}
              disabled={!suggested}
            >
              <IconBolt width={18} height={18} />
              판매가격에 적용
            </Button>
          </Card>

          <Card>
            <CardTitle description={user ? '내 메뉴에서 언제든 수정할 수 있습니다.' : '저장하려면 무료 회원가입이 필요합니다.'}>
              {editingMenu ? '메뉴 수정' : '메뉴 저장'}
            </CardTitle>
            {user && !editingMenu ? (
              <p
                className={`tnum mb-3 text-xs font-bold ${
                  limits.menus.atLimit ? 'text-red-500' : 'text-ink-400'
                }`}
              >
                {limits.menus.count}/{limits.menus.max}개 저장됨
                {limits.menus.atLimit ? ` · ${limitReachedMessage('menus')}` : ''}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                disabled={Boolean(user) && !editingMenu && limits.menus.atLimit}
                onClick={handleSave}
              >
                {editingMenu ? '수정 내용 저장하기' : '내 메뉴에 저장하기'}
              </Button>
              <Button variant="secondary" onClick={() => setResetOpen(true)}>
                새로 계산하기
              </Button>
              {!user ? (
                <p className="mt-1 text-center text-sm text-ink-500">
                  계산은 무료입니다.{' '}
                  <Link href="/login" className="font-semibold text-brand-600 underline">
                    회원가입
                  </Link>
                  하면 재료·메뉴를 저장할 수 있어요.
                </p>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>

      {/* 모바일 요약 바 */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink-500">
              재료 원가 · 원가율{' '}
              <span className={level ? COST_RATE_TEXT[level.id] : ''}>
                {costRate === null ? '-' : formatPercent(costRate)}
              </span>
            </p>
            <p className="tnum truncate text-xl font-extrabold text-ink-900">{formatWon(cost)}</p>
          </div>
          <button type="button" onClick={handleSave} className={buttonClass('primary', 'md')}>
            {editingMenu ? '수정 저장' : '메뉴 저장'}
          </button>
        </div>
      </div>

      <IngredientPicker
        open={pickerRowId !== null}
        ingredients={ingredients}
        onClose={() => setPickerRowId(null)}
        onSelect={handlePick}
      />

      <PrepPicker
        open={prepPickerOpen}
        preps={preps}
        ingredientMap={ingredientMap}
        onClose={() => setPrepPickerOpen(false)}
        onSelect={(prep) =>
          setDraft((prev) => ({
            ...prev,
            items: [...prev.items, rowFromPrep(prep, computePrepCost(prep, ingredientMap))],
          }))
        }
      />

      <SupplyPicker
        open={supplyPickerOpen}
        supplies={supplies}
        onClose={() => setSupplyPickerOpen(false)}
        onSelect={(supply) =>
          setDraft((prev) => ({ ...prev, items: [...prev.items, rowFromSupply(supply)] }))
        }
      />

      <ConfirmDialog
        open={resetOpen}
        title="새로 계산할까요?"
        message="지금 입력한 재료와 판매가격이 모두 지워집니다."
        confirmLabel="초기화"
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}
