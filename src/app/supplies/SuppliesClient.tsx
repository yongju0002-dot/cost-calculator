'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumberField, SelectField, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import {
  IconArrowDown,
  IconArrowUp,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { LoginGate } from '@/components/layout/LoginGate';
import { StockNav } from '@/components/layout/StockNav';
import { BulkImportModal } from '@/components/bulk/BulkImportModal';
import { useAuth } from '@/lib/auth/auth';
import { useData, type SupplyInput } from '@/lib/store/data';
import { computeUnitCost } from '@/lib/domain/cost';
import {
  applyThousandSeparator,
  formatPercentDelta,
  formatUnitCost,
  formatWon,
  parseNumberInput,
  roundTo,
} from '@/lib/domain/money';
import { UNIT_GROUPS, isUnit, type Unit } from '@/lib/domain/units';
import type { Supply } from '@/lib/domain/types';

interface FormState {
  name: string;
  price: string;
  quantity: string;
  unit: Unit;
  supplier: string;
  memo: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  price: '',
  quantity: '',
  unit: '개',
  supplier: '',
  memo: '',
};

function toFormState(supply: Supply): FormState {
  return {
    name: supply.name,
    price: applyThousandSeparator(String(supply.price)),
    quantity: applyThousandSeparator(String(supply.quantity)),
    unit: supply.unit,
    supplier: supply.supplier ?? '',
    memo: supply.memo ?? '',
  };
}

/** 직전 가격 대비 단위 원가 변동률 */
function priceChangeRate(supply: Supply): number | null {
  const history = supply.priceHistory;
  if (!history || history.length < 2) return null;
  const current = history[history.length - 1];
  const previous = history[history.length - 2];
  if (!previous.unitCost) return null;
  const rate = roundTo(((current.unitCost - previous.unitCost) / previous.unitCost) * 100, 1);
  return rate === 0 ? null : rate;
}

type SortKey = 'recent' | 'name' | 'unitCost';

export function SuppliesClient() {
  const { user, ready: authReady } = useAuth();
  const { supplies, menus, addSupply, updateSupply, removeSupply, addSuppliesBulk } = useData();
  const { showToast } = useToast();

  const [keyword, setKeyword] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Supply | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [deleting, setDeleting] = useState<Supply | null>(null);

  /** 부자재별로 사용 중인 메뉴 목록 */
  const usage = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const menu of menus) {
      const ids = new Set(
        menu.items.map((item) => item.supplyId).filter((id): id is string => Boolean(id)),
      );
      for (const id of ids) map.set(id, [...(map.get(id) ?? []), menu.name]);
    }
    return map;
  }, [menus]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const list = q ? supplies.filter((s) => s.name.toLowerCase().includes(q)) : [...supplies];
    return list.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko');
      if (sortKey === 'unitCost') {
        const au = computeUnitCost(a.price, a.quantity, a.unit)?.value ?? 0;
        const bu = computeUnitCost(b.price, b.quantity, b.unit)?.value ?? 0;
        return bu - au;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [supplies, keyword, sortKey]);

  if (!authReady) return null;
  if (!user) {
    return (
      <LoginGate
        title="부자재는 로그인 후 사용할 수 있어요"
        description="포장용기·젓가락·냅킨처럼 메뉴에 함께 나가는 소모품을 등록해두면 메뉴 원가에 자동으로 더해집니다."
        next="/supplies"
      />
    );
  }

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (supply: Supply) => {
    setEditing(supply);
    setForm(toFormState(supply));
    setErrors({});
    setFormOpen(true);
  };

  const validate = (): SupplyInput | null => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    const price = parseNumberInput(form.price);
    const quantity = parseNumberInput(form.quantity);

    if (!form.name.trim()) nextErrors.name = '부자재 이름을 입력해주세요.';
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
      supplier: form.supplier,
      memo: form.memo,
    };
  };

  const handleSubmit = () => {
    const input = validate();
    if (!input) return;

    if (editing) {
      const affected = updateSupply(editing.id, input);
      setFormOpen(false);
      showToast(
        affected.length > 0
          ? `${input.name} 가격이 변경되어 ${affected.length}개의 메뉴 원가가 변경되었습니다.`
          : `${input.name} 정보를 수정했습니다.`,
        affected.length > 0 ? 'warning' : 'success',
      );
      return;
    }

    addSupply(input);
    setFormOpen(false);
    showToast(`${input.name}을(를) 부자재에 추가했습니다.`, 'success');
  };

  const previewUnitCost = (() => {
    const price = parseNumberInput(form.price);
    const quantity = parseNumberInput(form.quantity);
    if (price === null || quantity === null) return null;
    return computeUnitCost(price, quantity, form.unit);
  })();

  const deletingUsage = deleting ? (usage.get(deleting.id) ?? []) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <StockNav />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">부자재</h1>
          <p className="mt-1.5 text-[15px] text-ink-500">
            포장용기·젓가락·냅킨처럼 메뉴와 함께 나가는 소모품을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setBulkOpen(true)}>
            대량 등록
          </Button>
          <Button onClick={openCreate}>
            <IconPlus width={18} height={18} />
            부자재 추가
          </Button>
        </div>
      </div>

      {supplies.length > 0 ? (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <IconSearch
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
              width={18}
              height={18}
            />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="부자재 이름으로 검색"
              className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-11 pr-4 text-[15px] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <SelectField
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            fieldClassName="sm:w-44"
          >
            <option value="recent">최근 수정순</option>
            <option value="name">이름순</option>
            <option value="unitCost">개당 가격 높은순</option>
          </SelectField>
        </div>
      ) : null}

      <div className="mt-5">
        {supplies.length === 0 ? (
          <EmptyState
            icon="🥡"
            title="등록된 부자재가 없습니다"
            description="도시락 용기 100개를 30,000원에 사셨다면 그대로 입력해보세요. 개당 300원으로 계산해 메뉴 원가에 더해드립니다."
            action={
              <>
                <Button onClick={openCreate}>
                  <IconPlus width={18} height={18} />
                  첫 번째 부자재 추가하기
                </Button>
                <Button variant="secondary" onClick={() => setBulkOpen(true)}>
                  엑셀에서 한 번에 등록
                </Button>
              </>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="검색 결과가 없습니다"
            description={`'${keyword}' 와(과) 일치하는 부자재를 찾지 못했습니다.`}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((supply) => {
              const unitCost = computeUnitCost(supply.price, supply.quantity, supply.unit);
              const change = priceChangeRate(supply);
              const usedIn = usage.get(supply.id) ?? [];
              return (
                <li key={supply.id}>
                  <Card className="flex h-full flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-[17px] font-bold text-ink-900">{supply.name}</h2>
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
                          <dd className="tnum font-semibold text-ink-800">
                            {formatWon(supply.price)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-ink-500">구매수량</dt>
                          <dd className="tnum font-semibold text-ink-800">
                            {supply.quantity}
                            {supply.unit}
                          </dd>
                        </div>
                        <div className="flex justify-between border-t border-ink-100 pt-1.5">
                          <dt className="font-semibold text-ink-600">개당 가격</dt>
                          <dd className="tnum text-lg font-extrabold text-brand-600">
                            {unitCost
                              ? `${formatUnitCost(unitCost.value)}원/${unitCost.unit}`
                              : '-'}
                          </dd>
                        </div>
                      </dl>

                      {supply.supplier ? (
                        <p className="mt-2 text-sm text-ink-500">공급업체 · {supply.supplier}</p>
                      ) : null}
                      {supply.memo ? (
                        <p className="mt-1 text-sm text-ink-500">{supply.memo}</p>
                      ) : null}
                      <p className="mt-2 text-xs font-semibold text-ink-400">
                        {usedIn.length > 0
                          ? `이 부자재를 사용하는 메뉴 ${usedIn.length}개`
                          : '아직 사용 중인 메뉴가 없습니다'}
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(supply)}>
                        <IconEdit width={16} height={16} />
                        수정
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(supply)}>
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
        title={editing ? '부자재 수정' : '부자재 추가'}
        description="구매한 단위 그대로 입력하시면 개당 가격은 자동으로 계산됩니다."
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
            label="부자재 이름"
            placeholder="예) 도시락 용기"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            error={errors.name}
          />
          <NumberField
            label="구매가격"
            suffix="원"
            placeholder="30,000"
            value={form.price}
            onValueChange={(raw) => setForm((prev) => ({ ...prev, price: raw }))}
            error={errors.price}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="구매수량"
              placeholder="100"
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
            label="공급업체 (선택)"
            placeholder="예) OO포장"
            value={form.supplier}
            onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
          />
          <TextField
            label="메모 (선택)"
            placeholder="예) 대량 주문 시 단가 인하"
            value={form.memo}
            onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
          />

          <div className="rounded-xl bg-brand-50 px-4 py-3">
            <p className="text-sm font-semibold text-brand-700">개당 가격</p>
            <p className="tnum mt-0.5 text-xl font-extrabold text-brand-700">
              {previewUnitCost
                ? `${formatUnitCost(previewUnitCost.value)}원 / 1${previewUnitCost.unit}`
                : '가격과 수량을 입력해주세요'}
            </p>
          </div>

          {editing && (usage.get(editing.id)?.length ?? 0) > 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              이 부자재는 {usage.get(editing.id)!.length}개 메뉴에서 사용 중입니다. 가격을 바꾸면 해당
              메뉴의 원가가 자동으로 다시 계산됩니다.
            </p>
          ) : null}
        </div>
      </Modal>

      <BulkImportModal
        open={bulkOpen}
        target="supply"
        onClose={() => setBulkOpen(false)}
        onSubmit={(rows) => {
          const created = addSuppliesBulk(rows);
          showToast(`부자재 ${created.length}개를 등록했습니다.`, 'success');
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="부자재를 삭제할까요?"
        message={
          deleting ? (
            <>
              <b>{deleting.name}</b>을(를) 삭제합니다.
              {deletingUsage.length > 0 ? (
                <>
                  <br />
                  <br />이 부자재는 현재 <b>{deletingUsage.length}개의 메뉴</b>에서 사용 중입니다.
                  삭제하면 해당 메뉴의 원가 계산에 영향을 줍니다.
                  <span className="mt-2 block rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
                    {deletingUsage.slice(0, 5).join(', ')}
                    {deletingUsage.length > 5 ? ` 외 ${deletingUsage.length - 5}개` : ''}
                  </span>
                  <span className="mt-2 block text-sm text-ink-500">
                    해당 메뉴는 마지막 가격을 그대로 유지하지만, 앞으로 가격 변경이 자동 반영되지
                    않습니다.
                  </span>
                </>
              ) : null}
            </>
          ) : null
        }
        onConfirm={() => {
          if (!deleting) return;
          removeSupply(deleting.id);
          showToast(`${deleting.name}을(를) 삭제했습니다.`);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
