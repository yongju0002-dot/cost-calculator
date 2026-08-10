'use client';

import { Badge } from '@/components/ui/Badge';
import { NumberField, SelectField, TextField } from '@/components/ui/Field';
import { IconBox, IconTrash } from '@/components/ui/Icons';
import { computeItemCost, computeUnitCost } from '@/lib/domain/cost';
import { formatUnitCost, formatWon } from '@/lib/domain/money';
import {
  UNIT_GROUPS,
  baseUnitOf,
  isConvertible,
  isUnit,
  unitsInFamilyOf,
  type Unit,
} from '@/lib/domain/units';
import { toRecipeItem, validateRow, type DraftItem } from './draft';

interface RecipeRowProps {
  row: DraftItem;
  index: number;
  showErrors: boolean;
  canPickIngredient: boolean;
  onChange: (row: DraftItem) => void;
  onRemove: () => void;
  onPickIngredient: () => void;
}

export function RecipeRow({
  row,
  index,
  showErrors,
  canPickIngredient,
  onChange,
  onRemove,
  onPickIngredient,
}: RecipeRowProps) {
  const issues = showErrors ? validateRow(row) : [];
  const errorOf = (field: string) => issues.find((i) => i.field === field)?.message ?? null;

  const item = toRecipeItem(row);
  const unitCost = computeUnitCost(item.price, item.quantity, item.unit);
  const cost = computeItemCost(item);
  // 재료 단위가 바뀌어 환산할 수 없는 상태라도 현재 선택값은 목록에 남겨둔다.
  const familyUnits = unitsInFamilyOf(row.unit);
  const amountUnits = familyUnits.includes(row.amountUnit)
    ? familyUnits
    : [row.amountUnit, ...familyUnits];

  const update = (patch: Partial<DraftItem>) => onChange({ ...row, ...patch });

  // 프렙·부자재는 등록해둔 값을 그대로 쓰므로 사용량만 입력받는다.
  if (row.kind === 'prep' || row.kind === 'supply') {
    const isPrep = row.kind === 'prep';
    const linked = isPrep ? row.prepId : row.supplyId;
    return (
      <li
        className={`rounded-xl border p-4 ${
          isPrep ? 'border-brand-200 bg-brand-50/40' : 'border-sky-200 bg-sky-50/40'
        }`}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={isPrep ? 'brand' : 'info'}>{isPrep ? '프렙' : '부자재'}</Badge>
              <span className="min-w-0 truncate text-[15px] font-bold text-ink-900">
                {index + 1}. {row.name || (isPrep ? '프렙' : '부자재')}
              </span>
            </div>

            {unitCost ? (
              <p className="mt-1.5 text-sm font-semibold text-ink-600">
                1{unitCost.unit}당 {formatUnitCost(unitCost.value)}원
                {isPrep ? ` · 총 ${formatWon(item.price)} / ${item.quantity}${item.unit}` : ''}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-amber-600">
                연결된 {isPrep ? '프렙' : '부자재'} 정보를 찾을 수 없습니다.
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <NumberField
                label="사용량"
                placeholder="0"
                value={row.amount}
                onValueChange={(raw) => update({ amount: raw })}
                error={errorOf('amount')}
                fieldClassName="col-span-1 sm:col-span-2"
              />
              <SelectField
                label="사용 단위"
                value={row.amountUnit}
                onChange={(e) =>
                  update({
                    amountUnit: isUnit(e.target.value) ? (e.target.value as Unit) : row.amountUnit,
                  })
                }
              >
                {amountUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </SelectField>
              <div className="flex flex-col justify-end">
                <span className="mb-1.5 block text-sm font-semibold text-ink-700">금액</span>
                <div className="tnum flex h-11 items-center justify-end rounded-xl bg-white px-3.5 text-[15px] font-bold text-ink-900">
                  {formatWon(cost)}
                </div>
              </div>
            </div>

            {linked ? (
              <p className="mt-2 text-xs font-semibold text-emerald-600">
                {isPrep ? '프렙' : '부자재'}와 연결됨 · 가격이 바뀌면 이 메뉴 원가도 자동으로
                바뀝니다.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onRemove}
            aria-label={`${row.name || (isPrep ? '프렙' : '부자재')} 삭제`}
            className="mt-1 rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <IconTrash />
          </button>
        </div>
      </li>
    );
  }

  if (row.kind === 'manual') {
    return (
      <li className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="flex items-start gap-2">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <TextField
              label={`${index + 1}. 기타 비용 항목`}
              placeholder="예) 포장용기, 양념, 가스비"
              value={row.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <NumberField
              label="금액"
              suffix="원"
              placeholder="0"
              value={row.manualCost}
              onValueChange={(raw) => update({ manualCost: raw })}
              error={errorOf('manualCost')}
              fieldClassName="sm:w-40"
            />
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${row.name || '기타 비용'} 삭제`}
            className="mt-7 rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <IconTrash />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-end gap-2">
            <TextField
              label={`${index + 1}. 재료명`}
              placeholder="예) 돼지고기"
              value={row.name}
              onChange={(e) => update({ name: e.target.value, ingredientId: null })}
              error={errorOf('name')}
              fieldClassName="flex-1"
            />
            {canPickIngredient ? (
              <button
                type="button"
                onClick={onPickIngredient}
                className="mb-0 flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-ink-200 px-3 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-50"
              >
                <IconBox width={18} height={18} />
                <span className="hidden sm:inline">내 재료</span>
              </button>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumberField
              label="구매가격"
              suffix="원"
              placeholder="0"
              value={row.price}
              onValueChange={(raw) => update({ price: raw })}
              error={errorOf('price')}
              fieldClassName="col-span-2"
            />
            <NumberField
              label="구매수량"
              placeholder="0"
              value={row.quantity}
              onValueChange={(raw) => update({ quantity: raw })}
              error={errorOf('quantity')}
            />
            <SelectField
              label="단위"
              value={row.unit}
              onChange={(e) => {
                const nextUnit = isUnit(e.target.value) ? (e.target.value as Unit) : 'g';
                // g -> 개 처럼 단위 계열이 바뀌면 기존 사용량은 의미가 없으므로 함께 비운다.
                const sameFamily = unitsInFamilyOf(nextUnit).includes(row.amountUnit);
                update({
                  unit: nextUnit,
                  amountUnit: sameFamily ? row.amountUnit : baseUnitOf(nextUnit),
                  amount: sameFamily ? row.amount : '',
                });
              }}
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

          {unitCost ? (
            <p className="mt-2 text-sm font-semibold text-brand-600">
              1{unitCost.unit}당 {formatUnitCost(unitCost.value)}원
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-400">구매가격과 구매수량을 입력하면 단위 원가가 계산됩니다.</p>
          )}

          {!isConvertible(row.unit, row.amountUnit) ? (
            <p className="mt-2 text-sm font-semibold text-amber-600">
              재료의 단위가 바뀌어 사용량을 계산할 수 없습니다. 사용량을 다시 입력해주세요.
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumberField
              label="사용량"
              placeholder="0"
              value={row.amount}
              onValueChange={(raw) => update({ amount: raw })}
              error={errorOf('amount')}
              fieldClassName="col-span-1 sm:col-span-2"
            />
            <SelectField
              label="사용 단위"
              value={row.amountUnit}
              onChange={(e) =>
                update({ amountUnit: isUnit(e.target.value) ? (e.target.value as Unit) : row.amountUnit })
              }
            >
              {amountUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </SelectField>
            <div className="flex flex-col justify-end">
              <span className="mb-1.5 block text-sm font-semibold text-ink-700">금액</span>
              <div className="tnum flex h-11 items-center justify-end rounded-xl bg-ink-50 px-3.5 text-[15px] font-bold text-ink-900">
                {formatWon(cost)}
              </div>
            </div>
          </div>

          {row.ingredientId ? (
            <p className="mt-2 text-xs font-semibold text-emerald-600">
              내 재료와 연결됨 · 재료 가격을 바꾸면 이 메뉴 원가도 자동으로 바뀝니다.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`${row.name || `${index + 1}번`} 재료 삭제`}
          className="mt-7 rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <IconTrash />
        </button>
      </div>
    </li>
  );
}
