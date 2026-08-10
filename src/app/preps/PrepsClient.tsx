'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { NumberField, SelectField, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import {
  IconArrowDown,
  IconArrowUp,
  IconCopy,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { LoginGate } from '@/components/layout/LoginGate';
import { StockNav } from '@/components/layout/StockNav';
import { RecipeRow } from '@/components/calculator/RecipeRow';
import { IngredientPicker } from '@/components/calculator/IngredientPicker';
import { useAuth } from '@/lib/auth/auth';
import { useData, type PrepInput } from '@/lib/store/data';
import {
  computeCostChange,
  computeItemCost,
  computePrepCost,
  prepUnitCost,
  syncPrepItems,
} from '@/lib/domain/cost';
import {
  applyThousandSeparator,
  formatPercentDelta,
  formatUnitCost,
  formatWon,
  formatWonDelta,
  parseNumberInput,
  roundTo,
} from '@/lib/domain/money';
import { UNIT_GROUPS, isUnit, type Unit } from '@/lib/domain/units';
import type { Ingredient, Prep } from '@/lib/domain/types';
import {
  createIngredientRow,
  createManualRow,
  isRowEmpty,
  rowFromIngredient,
  toRecipeItems,
  validateRow,
  type DraftItem,
} from '@/components/calculator/draft';

interface PrepForm {
  name: string;
  description: string;
  items: DraftItem[];
  yieldAmount: string;
  yieldUnit: Unit;
  memo: string;
}

const EMPTY_FORM: PrepForm = {
  name: '',
  description: '',
  items: [createIngredientRow(), createIngredientRow()],
  yieldAmount: '',
  yieldUnit: 'kg',
  memo: '',
};

function toForm(prep: Prep, ingredients: Map<string, Ingredient>): PrepForm {
  const synced = syncPrepItems(prep, ingredients);
  return {
    name: prep.name,
    description: prep.description ?? '',
    yieldAmount: prep.yieldAmount ? applyThousandSeparator(String(prep.yieldAmount)) : '',
    yieldUnit: prep.yieldUnit,
    memo: prep.memo ?? '',
    items: synced.map((item) => ({
      id: item.id,
      kind: item.kind,
      ingredientId: item.ingredientId,
      prepId: item.prepId ?? null,
      supplyId: item.supplyId ?? null,
      name: item.name,
      price: item.price ? applyThousandSeparator(String(item.price)) : '',
      quantity: item.quantity ? applyThousandSeparator(String(item.quantity)) : '',
      unit: item.unit,
      amount: item.amount ? applyThousandSeparator(String(item.amount)) : '',
      amountUnit: item.amountUnit,
      manualCost: item.manualCost ? applyThousandSeparator(String(item.manualCost)) : '',
    })),
  };
}

export function PrepsClient() {
  const { user, ready: authReady } = useAuth();
  const {
    preps,
    menus,
    ingredients,
    ingredientMap,
    addPrep,
    updatePrep,
    removePrep,
    duplicatePrep,
  } = useData();
  const { showToast } = useToast();

  const [keyword, setKeyword] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Prep | null>(null);
  const [form, setForm] = useState<PrepForm>(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [pickerRowId, setPickerRowId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Prep | null>(null);
  const [detail, setDetail] = useState<Prep | null>(null);

  /** 프렙별로 사용 중인 메뉴 이름 */
  const usage = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const menu of menus) {
      const ids = new Set(
        menu.items.map((item) => item.prepId).filter((id): id is string => Boolean(id)),
      );
      for (const id of ids) map.set(id, [...(map.get(id) ?? []), menu.name]);
    }
    return map;
  }, [menus]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return preps;
    return preps.filter((p) => p.name.toLowerCase().includes(q));
  }, [preps, keyword]);

  // 편집 중인 프렙의 실시간 계산
  const draftItems = useMemo(() => toRecipeItems(form.items), [form.items]);
  const draftCost = useMemo(
    () => draftItems.reduce((sum, item) => sum + computeItemCost(item), 0),
    [draftItems],
  );
  const draftYield = parseNumberInput(form.yieldAmount) ?? 0;
  const draftUnitCost = useMemo(() => {
    if (draftYield <= 0 || draftCost <= 0) return null;
    return prepUnitCost(
      {
        yieldAmount: draftYield,
        yieldUnit: form.yieldUnit,
        items: draftItems,
      } as Prep,
      ingredientMap,
    );
  }, [draftYield, form.yieldUnit, draftItems, draftCost, ingredientMap]);

  if (!authReady) return null;
  if (!user) {
    return (
      <LoginGate
        title="프렙은 로그인 후 사용할 수 있어요"
        description="양념장·육수처럼 미리 만들어두는 반제품을 등록하면, 메뉴에서 사용한 만큼만 원가에 반영됩니다."
        next="/preps"
      />
    );
  }

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, items: [createIngredientRow(), createIngredientRow()] });
    setShowErrors(false);
    setFormOpen(true);
  };

  const openEdit = (prep: Prep) => {
    setEditing(prep);
    setForm(toForm(prep, ingredientMap));
    setShowErrors(false);
    setFormOpen(true);
  };

  const updateRow = (row: DraftItem) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === row.id ? row : item)),
    }));
  };

  const removeRow = (id: string) => {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length <= 1 ? [createIngredientRow()] : prev.items.filter((i) => i.id !== id),
    }));
  };

  const handleSubmit = () => {
    const filled = form.items.filter((row) => !isRowEmpty(row));
    const invalid = filled.some((row) => validateRow(row).length > 0);

    if (!form.name.trim()) {
      setShowErrors(true);
      showToast('프렙 이름을 입력해주세요.', 'warning');
      return;
    }
    if (filled.length === 0) {
      setShowErrors(true);
      showToast('재료를 1개 이상 입력해주세요.', 'warning');
      return;
    }
    if (invalid) {
      setShowErrors(true);
      showToast('입력하지 않은 항목이 있습니다. 빨간색 안내를 확인해주세요.', 'warning');
      return;
    }
    if (draftYield <= 0) {
      setShowErrors(true);
      showToast('완성 후 총 생산량을 입력해주세요.', 'warning');
      return;
    }

    const payload: PrepInput = {
      name: form.name,
      description: form.description,
      items: toRecipeItems(filled),
      yieldAmount: draftYield,
      yieldUnit: form.yieldUnit,
      memo: form.memo,
    };

    if (editing) {
      const affected = updatePrep(editing.id, payload);
      setFormOpen(false);
      showToast(
        affected.length > 0
          ? `'${form.name}' 원가가 바뀌어 ${affected.length}개의 메뉴 원가도 변경되었습니다.`
          : `'${form.name}' 프렙을 수정했습니다.`,
        affected.length > 0 ? 'warning' : 'success',
      );
      return;
    }

    addPrep(payload);
    setFormOpen(false);
    showToast(`'${form.name}' 프렙을 저장했습니다.`, 'success');
  };

  const deletingUsage = deleting ? (usage.get(deleting.id) ?? []) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <StockNav />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">프렙</h1>
          <p className="mt-1.5 text-[15px] text-ink-500">
            양념장·육수처럼 미리 만들어두는 반제품입니다. 메뉴에서는 사용한 만큼만 원가에 반영됩니다.
          </p>
        </div>
        <Button onClick={openCreate}>
          <IconPlus width={18} height={18} />
          프렙 추가
        </Button>
      </div>

      {preps.length > 0 ? (
        <div className="relative mt-6">
          <IconSearch
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
            width={18}
            height={18}
          />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="프렙 이름으로 검색"
            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-11 pr-4 text-[15px] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      ) : null}

      <div className="mt-5">
        {preps.length === 0 ? (
          <EmptyState
            icon="🥣"
            title="등록된 프렙이 없습니다"
            description="고추장·간장·설탕을 섞어 만든 제육 양념장처럼, 여러 재료로 미리 만들어두는 것을 프렙으로 등록해보세요. 메뉴에서는 80g씩 쓴 만큼만 계산됩니다."
            action={
              <Button onClick={openCreate}>
                <IconPlus width={18} height={18} />첫 번째 프렙 만들기
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="검색 결과가 없습니다"
            description={`'${keyword}' 와(과) 일치하는 프렙을 찾지 못했습니다.`}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((prep) => {
              const cost = computePrepCost(prep, ingredientMap);
              const unitCost = prepUnitCost(prep, ingredientMap);
              const change = computeCostChange(prep.costHistory);
              const usedIn = usage.get(prep.id) ?? [];
              return (
                <li key={prep.id}>
                  <Card className="flex h-full flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-[17px] font-bold text-ink-900">{prep.name}</h2>
                          {prep.description ? (
                            <p className="mt-0.5 text-sm text-ink-500">{prep.description}</p>
                          ) : null}
                        </div>
                        {change ? (
                          <Badge tone={change.direction === 'up' ? 'danger' : 'success'}>
                            {change.direction === 'up' ? (
                              <IconArrowUp width={12} height={12} />
                            ) : (
                              <IconArrowDown width={12} height={12} />
                            )}
                            {formatPercentDelta(change.rate)}
                          </Badge>
                        ) : null}
                      </div>

                      <dl className="mt-3 flex flex-col gap-1.5 text-[15px]">
                        <div className="flex justify-between">
                          <dt className="text-ink-500">총 재료 원가</dt>
                          <dd className="tnum font-semibold text-ink-800">{formatWon(cost)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-ink-500">총 생산량</dt>
                          <dd className="tnum font-semibold text-ink-800">
                            {prep.yieldAmount}
                            {prep.yieldUnit}
                          </dd>
                        </div>
                        <div className="flex justify-between border-t border-ink-100 pt-1.5">
                          <dt className="font-semibold text-ink-600">
                            {unitCost && (unitCost.unit === 'g' || unitCost.unit === 'ml')
                              ? `100${unitCost.unit}당 원가`
                              : '단위당 원가'}
                          </dt>
                          <dd className="tnum text-lg font-extrabold text-brand-600">
                            {unitCost
                              ? unitCost.unit === 'g' || unitCost.unit === 'ml'
                                ? formatWon(roundTo(unitCost.value * 100, 0))
                                : `${formatUnitCost(unitCost.value)}원/${unitCost.unit}`
                              : '-'}
                          </dd>
                        </div>
                      </dl>

                      <p className="mt-2 text-xs font-semibold text-ink-400">
                        재료 {prep.items.length}가지 ·{' '}
                        {usedIn.length > 0
                          ? `메뉴 ${usedIn.length}개에서 사용 중`
                          : '아직 사용 중인 메뉴 없음'}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setDetail(prep)}>
                        상세
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openEdit(prep)}>
                        <IconEdit width={16} height={16} />
                        수정
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const copy = duplicatePrep(prep.id);
                          if (copy) showToast(`'${copy.name}'을(를) 만들었습니다.`, 'success');
                        }}
                      >
                        <IconCopy width={16} height={16} />
                        복사
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(prep)}>
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

      {/* 프렙 만들기 / 수정하기 */}
      <Modal
        open={formOpen}
        size="lg"
        onClose={() => setFormOpen(false)}
        title={editing ? '프렙 수정' : '프렙 추가'}
        description="재료를 넣고 완성된 총량을 적으면 단위당 원가를 계산해드립니다."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit}>{editing ? '수정 저장' : '저장하기'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            label="프렙 이름"
            placeholder="예) 제육 양념장"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            error={showErrors && !form.name.trim() ? '프렙 이름을 입력해주세요.' : null}
          />
          <TextField
            label="설명 (선택)"
            placeholder="예) 제육볶음·불고기에 공통으로 사용"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink-700">재료</p>
            <ul className="flex flex-col gap-3">
              {form.items.map((row, index) => (
                <RecipeRow
                  key={row.id}
                  row={row}
                  index={index}
                  showErrors={showErrors && !isRowEmpty(row)}
                  canPickIngredient={ingredients.length > 0}
                  onChange={updateRow}
                  onRemove={() => removeRow(row.id)}
                  onPickIngredient={() => setPickerRowId(row.id)}
                />
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="soft"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({ ...prev, items: [...prev.items, createIngredientRow()] }))
                }
              >
                <IconPlus width={16} height={16} />
                재료 추가
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({ ...prev, items: [...prev.items, createManualRow()] }))
                }
              >
                <IconPlus width={16} height={16} />
                기타 비용 추가
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="완성 후 총 생산량"
              placeholder="2"
              value={form.yieldAmount}
              onValueChange={(raw) => setForm((prev) => ({ ...prev, yieldAmount: raw }))}
              error={showErrors && draftYield <= 0 ? '총 생산량을 입력해주세요.' : null}
            />
            <SelectField
              label="생산 단위"
              value={form.yieldUnit}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  yieldUnit: isUnit(e.target.value) ? (e.target.value as Unit) : prev.yieldUnit,
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
            placeholder="예) 냉장 보관 5일"
            value={form.memo}
            onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
          />

          <div className="rounded-xl bg-brand-50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-brand-700">총 재료 원가</span>
              <span className="tnum text-xl font-extrabold text-brand-700">
                {formatWon(draftCost)}
              </span>
            </div>
            {draftUnitCost ? (
              <p className="tnum mt-1 text-sm text-brand-600">
                1{draftUnitCost.unit}당 {formatUnitCost(draftUnitCost.value)}원
                {draftUnitCost.unit === 'g' || draftUnitCost.unit === 'ml'
                  ? ` · 100${draftUnitCost.unit}당 ${formatWon(roundTo(draftUnitCost.value * 100, 0))}`
                  : ''}
              </p>
            ) : (
              <p className="mt-1 text-sm text-brand-600">재료와 총 생산량을 입력해주세요.</p>
            )}
          </div>

          {editing && (usage.get(editing.id)?.length ?? 0) > 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              이 프렙은 {usage.get(editing.id)!.length}개 메뉴에서 사용 중입니다. 수정하면 해당 메뉴의
              원가가 자동으로 다시 계산됩니다.
            </p>
          ) : null}
        </div>
      </Modal>

      {/* 프렙 상세 */}
      <Modal
        open={detail !== null}
        size="lg"
        onClose={() => setDetail(null)}
        title={detail?.name ?? ''}
        description={detail?.description}
      >
        {detail ? <PrepDetail prep={detail} ingredientMap={ingredientMap} usedIn={usage.get(detail.id) ?? []} /> : null}
      </Modal>

      <IngredientPicker
        open={pickerRowId !== null}
        ingredients={ingredients}
        onClose={() => setPickerRowId(null)}
        onSelect={(ingredient) =>
          setForm((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
              item.id === pickerRowId ? rowFromIngredient(ingredient, item) : item,
            ),
          }))
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        title="프렙을 삭제할까요?"
        message={
          deleting ? (
            <>
              <b>{deleting.name}</b>을(를) 삭제합니다.
              {deletingUsage.length > 0 ? (
                <>
                  <br />
                  <br />이 프렙은 현재 <b>{deletingUsage.length}개의 메뉴</b>에서 사용 중입니다.
                  삭제하면 해당 메뉴의 원가 계산에 영향을 줍니다.
                  <span className="mt-2 block rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
                    {deletingUsage.slice(0, 5).join(', ')}
                    {deletingUsage.length > 5 ? ` 외 ${deletingUsage.length - 5}개` : ''}
                  </span>
                  <span className="mt-2 block text-sm text-ink-500">
                    해당 메뉴는 마지막 원가를 그대로 유지하지만, 앞으로 재료 가격 변경이 자동
                    반영되지 않습니다.
                  </span>
                </>
              ) : null}
            </>
          ) : null
        }
        onConfirm={() => {
          if (!deleting) return;
          removePrep(deleting.id);
          showToast(`'${deleting.name}' 프렙을 삭제했습니다.`);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

/** 프렙 상세: 원가 구성 비율까지 보여준다. */
function PrepDetail({
  prep,
  ingredientMap,
  usedIn,
}: {
  prep: Prep;
  ingredientMap: Map<string, Ingredient>;
  usedIn: string[];
}) {
  const items = syncPrepItems(prep, ingredientMap);
  const cost = computePrepCost(prep, ingredientMap);
  const unitCost = prepUnitCost(prep, ingredientMap);
  const change = computeCostChange(prep.costHistory);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-ink-200 p-3">
          <p className="text-xs font-semibold text-ink-500">총 재료 원가</p>
          <p className="tnum mt-1 text-xl font-extrabold text-ink-900">{formatWon(cost)}</p>
        </div>
        <div className="rounded-xl border border-ink-200 p-3">
          <p className="text-xs font-semibold text-ink-500">총 생산량</p>
          <p className="tnum mt-1 text-xl font-extrabold text-ink-900">
            {prep.yieldAmount}
            {prep.yieldUnit}
          </p>
        </div>
        <div className="rounded-xl bg-brand-50 p-3">
          <p className="text-xs font-semibold text-brand-700">단위당 원가</p>
          <p className="tnum mt-1 text-xl font-extrabold text-brand-700">
            {unitCost ? `${formatUnitCost(unitCost.value)}원/${unitCost.unit}` : '-'}
          </p>
        </div>
        <div className="rounded-xl bg-brand-50 p-3">
          <p className="text-xs font-semibold text-brand-700">
            {unitCost?.unit === 'ml' ? '100ml당' : '100g당'} 원가
          </p>
          <p className="tnum mt-1 text-xl font-extrabold text-brand-700">
            {unitCost && (unitCost.unit === 'g' || unitCost.unit === 'ml')
              ? formatWon(roundTo(unitCost.value * 100, 0))
              : '-'}
          </p>
        </div>
      </div>

      {change ? (
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
            change.direction === 'up' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {change.direction === 'up' ? (
            <IconArrowUp width={16} height={16} />
          ) : (
            <IconArrowDown width={16} height={16} />
          )}
          <span className="tnum">
            지난 원가 {formatWon(change.previous)} → {formatWon(change.current)} (
            {formatWonDelta(change.diff)}, {formatPercentDelta(change.rate)})
          </span>
        </div>
      ) : null}

      <div>
        <CardTitle description="각 재료가 프렙 원가에서 차지하는 비중입니다.">원가 구성</CardTitle>
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const itemCost = computeItemCost(item);
            const ratio = cost > 0 ? roundTo((itemCost / cost) * 100, 1) : 0;
            return (
              <li key={item.id}>
                <div className="flex items-baseline justify-between gap-2 text-[15px]">
                  <span className="min-w-0 truncate font-semibold text-ink-800">{item.name}</span>
                  <span className="tnum shrink-0 text-ink-600">
                    {item.kind === 'manual'
                      ? formatWon(itemCost)
                      : `${item.amount}${item.amountUnit} · ${formatWon(itemCost)}`}
                    <span className="ml-2 font-bold text-brand-600">{ratio}%</span>
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-400"
                    style={{ width: `${Math.min(100, ratio)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {usedIn.length > 0 ? (
        <div>
          <p className="text-sm font-bold text-ink-800">이 프렙을 사용하는 메뉴</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {usedIn.map((name) => (
              <Badge key={name} tone="neutral">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {prep.memo ? (
        <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">{prep.memo}</p>
      ) : null}
    </div>
  );
}
