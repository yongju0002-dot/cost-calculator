'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumberField, SelectField, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { IconArrowDown, IconArrowUp, IconEdit, IconPlus, IconSearch, IconTrash } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { LoginGate } from '@/components/layout/LoginGate';
import { StockNav } from '@/components/layout/StockNav';
import { BulkImportModal } from '@/components/bulk/BulkImportModal';
import { PurchaseHistoryModal } from '@/components/purchase/PurchaseHistoryModal';
import { useAuth } from '@/lib/auth/auth';
import { useData, type IngredientInput } from '@/lib/store/data';
import { computeUnitCost, ingredientUnitCost } from '@/lib/domain/cost';
import { limitReachedMessage } from '@/lib/domain/limits';
import {
  applyThousandSeparator,
  formatPercentDelta,
  formatUnitCost,
  formatWon,
  parseNumberInput,
  roundTo,
} from '@/lib/domain/money';
import { UNIT_GROUPS, isUnit, type Unit } from '@/lib/domain/units';
import type { Ingredient } from '@/lib/domain/types';

interface FormState {
  name: string;
  price: string;
  quantity: string;
  unit: Unit;
  memo: string;
}

const EMPTY_FORM: FormState = { name: '', price: '', quantity: '', unit: 'kg', memo: '' };

function toFormState(ingredient: Ingredient): FormState {
  return {
    name: ingredient.name,
    price: applyThousandSeparator(String(ingredient.price)),
    quantity: applyThousandSeparator(String(ingredient.quantity)),
    unit: ingredient.unit,
    memo: ingredient.memo ?? '',
  };
}

/** 직전 가격 대비 단위 원가 변동률 */
function priceChangeRate(ingredient: Ingredient): number | null {
  const history = ingredient.priceHistory;
  if (!history || history.length < 2) return null;
  const current = history[history.length - 1];
  const previous = history[history.length - 2];
  if (!previous.unitCost) return null;
  const rate = roundTo(((current.unitCost - previous.unitCost) / previous.unitCost) * 100, 1);
  return rate === 0 ? null : rate;
}

export function IngredientsClient() {
  const { user, ready: authReady } = useAuth();
  const {
    ingredients,
    menus,
    preps,
    limits,
    addIngredient,
    updateIngredient,
    removeIngredient,
    addIngredientsBulk,
    loadSampleData,
  } = useData();
  const { showToast } = useToast();

  const [keyword, setKeyword] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<Ingredient | null>(null);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [deleting, setDeleting] = useState<Ingredient | null>(null);

  /** 메뉴와 프렙 양쪽에서 쓰이는 횟수를 센다. */
  const usageCount = useMemo(() => {
    const counts = new Map<string, number>();
    const countFrom = (items: { ingredientId: string | null }[]) => {
      const ids = new Set(items.map((item) => item.ingredientId).filter(Boolean) as string[]);
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    };
    for (const menu of menus) countFrom(menu.items);
    for (const prep of preps) countFrom(prep.items);
    return counts;
  }, [menus, preps]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, keyword]);

  if (!authReady) return null;
  if (!user) {
    return (
      <LoginGate
        title="내 재료는 로그인 후 사용할 수 있어요"
        description="자주 쓰는 식재료의 구매가격과 단위 원가를 저장해 두면, 메뉴 원가를 계산할 때 바로 불러올 수 있습니다."
        next="/ingredients"
      />
    );
  }

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (ingredient: Ingredient) => {
    setEditing(ingredient);
    setForm(toFormState(ingredient));
    setErrors({});
    setFormOpen(true);
  };

  const validate = (): IngredientInput | null => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    const price = parseNumberInput(form.price);
    const quantity = parseNumberInput(form.quantity);

    if (!form.name.trim()) nextErrors.name = '재료명을 입력해주세요.';
    if (price === null) nextErrors.price = '구매가격을 입력해주세요.';
    else if (price <= 0) nextErrors.price = '구매가격은 0원보다 커야 합니다.';
    if (quantity === null) nextErrors.quantity = '구매수량을 입력해주세요.';
    else if (quantity <= 0) nextErrors.quantity = '구매수량은 0보다 커야 합니다.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    return {
      name: form.name,
      price: price!,
      quantity: quantity!,
      unit: form.unit,
      memo: form.memo,
    };
  };

  const handleSubmit = () => {
    const input = validate();
    if (!input) return;

    if (editing) {
      const affected = updateIngredient(editing.id, input);
      setFormOpen(false);
      if (affected.length > 0) {
        showToast(
          `${input.name} 가격이 변경되어 ${affected.length}개의 메뉴 원가가 변경되었습니다.`,
          'warning',
        );
      } else {
        showToast(`${input.name} 정보를 수정했습니다.`, 'success');
      }
      return;
    }

    const created = addIngredient(input);
    if (!created) {
      showToast(limitReachedMessage('ingredients'), 'warning');
      return;
    }
    setFormOpen(false);
    showToast(`${input.name}을(를) 내 재료에 추가했습니다.`, 'success');
  };

  const previewUnitCost = (() => {
    const price = parseNumberInput(form.price);
    const quantity = parseNumberInput(form.quantity);
    if (price === null || quantity === null) return null;
    return computeUnitCost(price, quantity, form.unit);
  })();

  // 매입 이력 창은 열려 있는 동안 값이 바뀌므로 항상 최신 재료를 참조한다.
  const liveHistoryTarget = historyFor
    ? (ingredients.find((i) => i.id === historyFor.id) ?? null)
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <StockNav />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">내 재료</h1>
          <p className="mt-1.5 text-[15px] text-ink-500">
            자주 쓰는 식재료를 저장해 두면 메뉴를 만들 때 바로 불러올 수 있습니다.
          </p>
          <p className={`tnum mt-1 text-xs font-bold ${limits.ingredients.atLimit ? 'text-red-500' : 'text-ink-400'}`}>
            {limits.ingredients.count}/{limits.ingredients.max}개 등록됨
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={limits.ingredients.atLimit}
            onClick={() => setBulkOpen(true)}
          >
            대량 등록
          </Button>
          <Button disabled={limits.ingredients.atLimit} onClick={openCreate}>
            <IconPlus width={18} height={18} />
            재료 추가
          </Button>
        </div>
      </div>

      {ingredients.length > 0 ? (
        <div className="relative mt-6">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" width={18} height={18} />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="재료명으로 검색"
            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-11 pr-4 text-[15px] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      ) : null}

      <div className="mt-5">
        {ingredients.length === 0 ? (
          <EmptyState
            icon="🧺"
            title="저장된 재료가 없습니다"
            description="돼지고기 45,000원 / 5kg 처럼 구매한 그대로 입력하면 1g당 단위 원가를 자동으로 계산해 드립니다."
            action={
              <>
                <Button onClick={openCreate}>
                  <IconPlus width={18} height={18} />
                  재료 추가
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    loadSampleData();
                    showToast('예시 재료와 메뉴를 불러왔습니다. 자유롭게 수정하거나 삭제하세요.', 'success');
                  }}
                >
                  예시 데이터 불러오기
                </Button>
              </>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="검색 결과가 없습니다" description={`'${keyword}' 와(과) 일치하는 재료를 찾지 못했습니다.`} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((ingredient) => {
              const unitCost = ingredientUnitCost(ingredient);
              const change = priceChangeRate(ingredient);
              const used = usageCount.get(ingredient.id) ?? 0;
              return (
                <li key={ingredient.id}>
                  <Card className="flex h-full flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-[17px] font-bold text-ink-900">{ingredient.name}</h2>
                        {change !== null ? (
                          <Badge tone={change > 0 ? 'danger' : 'success'}>
                            {change > 0 ? (
                              <IconArrowUp width={12} height={12} />
                            ) : (
                              <IconArrowDown width={12} height={12} />
                            )}
                            {formatPercentDelta(change)}
                          </Badge>
                        ) : null}
                      </div>

                      <dl className="mt-3 flex flex-col gap-1.5 text-[15px]">
                        <div className="flex justify-between">
                          <dt className="text-ink-500">구매가격</dt>
                          <dd className="tnum font-semibold text-ink-800">{formatWon(ingredient.price)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-ink-500">구매량</dt>
                          <dd className="tnum font-semibold text-ink-800">
                            {ingredient.quantity}
                            {ingredient.unit}
                          </dd>
                        </div>
                        <div className="flex justify-between border-t border-ink-100 pt-1.5">
                          <dt className="font-semibold text-ink-600">단위 원가</dt>
                          <dd className="tnum text-lg font-extrabold text-brand-600">
                            {unitCost ? `${formatUnitCost(unitCost.value)}원/${unitCost.unit}` : '-'}
                          </dd>
                        </div>
                      </dl>

                      {ingredient.memo ? (
                        <p className="mt-2 text-sm text-ink-500">{ingredient.memo}</p>
                      ) : null}
                      {used > 0 ? (
                        <p className="mt-2 text-xs font-semibold text-ink-400">
                          이 재료를 사용하는 메뉴 {used}개
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(ingredient)}>
                        <IconEdit width={16} height={16} />
                        수정
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setHistoryFor(ingredient)}>
                        매입 이력
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(ingredient)}>
                        <IconTrash width={16} height={16} />
                        삭제
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? '재료 수정' : '재료 추가'}
        description="구매한 단위 그대로 입력하시면 단위 원가는 자동으로 계산됩니다."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit}>{editing ? '수정 저장' : '추가하기'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            label="재료명"
            placeholder="예) 돼지고기 앞다리살"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            error={errors.name}
          />
          <NumberField
            label="구매가격"
            suffix="원"
            placeholder="45,000"
            value={form.price}
            onValueChange={(raw) => setForm((prev) => ({ ...prev, price: raw }))}
            error={errors.price}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="구매수량"
              placeholder="5"
              value={form.quantity}
              onValueChange={(raw) => setForm((prev) => ({ ...prev, quantity: raw }))}
              error={errors.quantity}
            />
            <SelectField
              label="단위"
              value={form.unit}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  unit: isUnit(e.target.value) ? (e.target.value as Unit) : prev.unit,
                }))
              }
            >
              {UNIT_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.units.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </optgroup>
              ))}
            </SelectField>
          </div>
          <TextField
            label="메모 (선택)"
            placeholder="예) OO상회, 주 2회 입고"
            value={form.memo}
            onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
          />

          <div className="rounded-xl bg-brand-50 px-4 py-3">
            <p className="text-sm font-semibold text-brand-700">단위 원가</p>
            <p className="tnum mt-0.5 text-xl font-extrabold text-brand-700">
              {previewUnitCost
                ? `${formatUnitCost(previewUnitCost.value)}원 / 1${previewUnitCost.unit}`
                : '가격과 수량을 입력해주세요'}
            </p>
          </div>

          {editing && (usageCount.get(editing.id) ?? 0) > 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              이 재료는 {usageCount.get(editing.id)}개 메뉴에서 사용 중입니다. 가격을 바꾸면 해당 메뉴의
              원가가 자동으로 다시 계산됩니다.
            </p>
          ) : null}
        </div>
      </Modal>

      <BulkImportModal
        open={bulkOpen}
        target="ingredient"
        onClose={() => setBulkOpen(false)}
        onSubmit={(rows) => {
          const created = addIngredientsBulk(rows);
          const skipped = rows.length - created.length;
          showToast(
            skipped > 0
              ? `재료 ${created.length}개를 등록했습니다. (${limitReachedMessage('ingredients')} ${skipped}건은 등록되지 않았습니다.)`
              : `재료 ${created.length}개를 등록했습니다.`,
            skipped > 0 ? 'warning' : 'success',
          );
        }}
      />

      <PurchaseHistoryModal
        open={historyFor !== null}
        targetType="ingredient"
        targetId={liveHistoryTarget?.id ?? null}
        targetName={liveHistoryTarget?.name ?? ''}
        currentUnit={liveHistoryTarget?.unit ?? 'kg'}
        pricingMode={liveHistoryTarget?.pricingMode ?? 'manual'}
        onClose={() => setHistoryFor(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="재료를 삭제할까요?"
        message={
          deleting ? (
            <>
              <b>{deleting.name}</b>을(를) 내 재료에서 삭제합니다.
              {(usageCount.get(deleting.id) ?? 0) > 0
                ? ` 이 재료를 사용하는 메뉴 ${usageCount.get(deleting.id)}개는 마지막 가격을 그대로 유지하지만, 앞으로 가격 변경이 자동 반영되지 않습니다.`
                : ''}
            </>
          ) : null
        }
        onConfirm={() => {
          if (!deleting) return;
          removeIngredient(deleting.id);
          showToast(`${deleting.name}을(를) 삭제했습니다.`);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
