'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { NumberField, SelectField, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { useData } from '@/lib/store/data';
import { purchasesOf, purchaseUnitCost } from '@/lib/domain/cost';
import {
  formatPercentDelta,
  formatUnitCost,
  formatWon,
  parseNumberInput,
  roundTo,
} from '@/lib/domain/money';
import { UNIT_GROUPS, isUnit, type Unit } from '@/lib/domain/units';
import type { PricingMode } from '@/lib/domain/types';

const PRICING_LABELS: { mode: PricingMode; label: string; help: string }[] = [
  { mode: 'manual', label: '직접 입력', help: '재료 화면에서 입력한 가격을 그대로 씁니다.' },
  { mode: 'latest', label: '최근 매입가', help: '가장 최근 매입 기록의 가격을 씁니다.' },
  { mode: 'average', label: '평균 매입가', help: '전체 매입 기록의 평균 단가를 씁니다.' },
];

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * 식재료·부자재의 날짜별 매입가 이력.
 * 기록을 남기면 "가격 기준"에 따라 현재 적용 가격이 자동으로 바뀐다.
 */
export function PurchaseHistoryModal({
  open,
  targetType,
  targetId,
  targetName,
  currentUnit,
  pricingMode,
  onClose,
}: {
  open: boolean;
  targetType: 'ingredient' | 'supply';
  targetId: string | null;
  targetName: string;
  currentUnit: Unit;
  pricingMode: PricingMode;
  onClose: () => void;
}) {
  const { purchases, addPurchase, removePurchase, setPricingMode } = useData();
  const { showToast } = useToast();

  const [purchasedAt, setPurchasedAt] = useState(today());
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>(currentUnit);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const records = useMemo(
    () => (targetId ? purchasesOf(purchases, targetType, targetId) : []),
    [purchases, targetType, targetId],
  );

  // 그래프는 오래된 것부터 왼쪽으로 그린다.
  const chronological = useMemo(() => [...records].reverse(), [records]);
  const maxUnitCost = Math.max(...chronological.map((r) => r.unitCost), 0);

  const change = useMemo(() => {
    if (records.length < 2) return null;
    const [current, previous] = records;
    if (!previous.unitCost) return null;
    const rate = roundTo(((current.unitCost - previous.unitCost) / previous.unitCost) * 100, 1);
    return { current, previous, rate };
  }, [records]);

  const handleAdd = () => {
    if (!targetId) return;
    const q = parseNumberInput(quantity);
    const a = parseNumberInput(amount);
    if (!purchasedAt) return setError('구매일을 선택해주세요.');
    if (q === null || q <= 0) return setError('구매 수량은 0보다 커야 합니다.');
    if (a === null || a <= 0) return setError('구매 금액은 0원보다 커야 합니다.');

    setError(null);
    const affected = addPurchase({
      targetType,
      targetId,
      purchasedAt,
      supplier,
      quantity: q,
      unit,
      amount: a,
      memo,
    });
    setQuantity('');
    setAmount('');
    setMemo('');
    showToast(
      affected.length > 0
        ? `매입 기록을 추가했고 ${affected.length}개 메뉴의 원가가 변경되었습니다.`
        : '매입 기록을 추가했습니다.',
      affected.length > 0 ? 'warning' : 'success',
    );
  };

  return (
    <Modal
      open={open}
      size="lg"
      onClose={onClose}
      title={`${targetName} 매입가 이력`}
      description="구매할 때마다 기록해두면 가격 변동을 한눈에 볼 수 있습니다."
    >
      <div className="flex flex-col gap-5">
        {/* 가격 기준 */}
        <div>
          <p className="text-sm font-bold text-ink-800">원가 계산에 사용할 가격</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {PRICING_LABELS.map(({ mode, label, help }) => {
              const active = pricingMode === mode;
              const disabled = mode !== 'manual' && records.length === 0;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={disabled || !targetId}
                  onClick={() => {
                    if (!targetId) return;
                    const affected = setPricingMode(targetType, targetId, mode);
                    showToast(
                      affected.length > 0
                        ? `가격 기준을 바꿔 ${affected.length}개 메뉴의 원가가 변경되었습니다.`
                        : `가격 기준을 '${label}'(으)로 바꿨습니다.`,
                      affected.length > 0 ? 'warning' : 'success',
                    );
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    active
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-ink-200 bg-white hover:bg-ink-50'
                  }`}
                >
                  <span
                    className={`block text-sm font-bold ${active ? 'text-brand-700' : 'text-ink-800'}`}
                  >
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{help}</span>
                </button>
              );
            })}
          </div>
          {records.length === 0 ? (
            <p className="mt-2 text-xs text-ink-400">
              매입 기록을 1건 이상 추가하면 최근·평균 매입가를 쓸 수 있습니다.
            </p>
          ) : null}
        </div>

        {/* 가격 변동 요약 */}
        {change ? (
          <div
            className={`flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${
              change.rate > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {change.rate > 0 ? (
              <IconArrowUp width={16} height={16} />
            ) : (
              <IconArrowDown width={16} height={16} />
            )}
            <span className="tnum">
              이전 {formatUnitCost(change.previous.unitCost)}원 → 현재{' '}
              {formatUnitCost(change.current.unitCost)}원 ({formatPercentDelta(change.rate)})
            </span>
          </div>
        ) : null}

        {/* 가격 추이 그래프 */}
        {chronological.length > 0 ? (
          <div>
            <p className="text-sm font-bold text-ink-800">가격 추이</p>
            <div className="mt-3 flex items-end gap-1.5 overflow-x-auto pb-1">
              {chronological.map((record) => {
                const height = maxUnitCost > 0 ? (record.unitCost / maxUnitCost) * 100 : 0;
                return (
                  <div key={record.id} className="flex min-w-14 flex-1 flex-col items-center gap-1">
                    <span className="tnum text-[11px] font-bold text-ink-600">
                      {formatUnitCost(record.unitCost)}
                    </span>
                    <div className="flex h-24 w-full items-end">
                      <div
                        className="w-full rounded-t-md bg-brand-400"
                        style={{ height: `${Math.max(4, height)}%` }}
                        title={`${record.purchasedAt} · ${formatWon(record.amount)}`}
                      />
                    </div>
                    <span className="text-[10px] text-ink-400">{record.purchasedAt.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-ink-400">막대 높이는 기준 단위당 가격입니다.</p>
          </div>
        ) : null}

        {/* 기록 목록 */}
        <div>
          <p className="text-sm font-bold text-ink-800">매입 기록</p>
          {records.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title="아직 매입 기록이 없습니다"
                description="아래에서 구매일과 금액을 입력하면 가격 변동을 자동으로 계산해드립니다."
              />
            </div>
          ) : (
            <ul className="mt-2 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
              {records.map((record, index) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="tnum text-sm font-bold text-ink-900">
                      {record.purchasedAt} · {record.quantity}
                      {record.unit} · {formatWon(record.amount)}
                    </p>
                    <p className="tnum text-xs text-ink-500">
                      {formatUnitCost(record.unitCost)}원/기준단위
                      {record.supplier ? ` · ${record.supplier}` : ''}
                      {record.memo ? ` · ${record.memo}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {index === 0 ? <Badge tone="brand">최근</Badge> : null}
                    <button
                      type="button"
                      onClick={() => {
                        removePurchase(record.id);
                        showToast('매입 기록을 삭제했습니다.');
                      }}
                      aria-label="매입 기록 삭제"
                      className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 기록 추가 */}
        <div className="rounded-xl border border-ink-200 p-4">
          <p className="text-sm font-bold text-ink-800">매입 기록 추가</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField
              label="구매일"
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
            />
            <TextField
              label="공급업체 (선택)"
              placeholder="예) OO상회"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="구매 수량"
                placeholder="10"
                value={quantity}
                onValueChange={setQuantity}
              />
              <SelectField
                label="단위"
                value={unit}
                onChange={(e) =>
                  setUnit(isUnit(e.target.value) ? (e.target.value as Unit) : unit)
                }
              >
                {UNIT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </SelectField>
            </div>
            <NumberField
              label="구매 금액"
              suffix="원"
              placeholder="90,000"
              value={amount}
              onValueChange={setAmount}
            />
          </div>
          <TextField
            label="메모 (선택)"
            placeholder="예) 특가 행사"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            fieldClassName="mt-3"
          />

          {(() => {
            const q = parseNumberInput(quantity);
            const a = parseNumberInput(amount);
            if (q === null || a === null || q <= 0) return null;
            const unitCost = purchaseUnitCost({ quantity: q, unit, amount: a });
            return (
              <p className="tnum mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">
                단위당 {formatUnitCost(unitCost)}원
              </p>
            );
          })()}

          {error ? (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}

          <Button className="mt-3 w-full" onClick={handleAdd}>
            <IconPlus width={18} height={18} />
            기록 추가
          </Button>
        </div>
      </div>
    </Modal>
  );
}
