'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { computeUnitCost, prepUnitCost } from '@/lib/domain/cost';
import { formatUnitCost, formatWon } from '@/lib/domain/money';
import type { Ingredient, Prep, Supply } from '@/lib/domain/types';

/** 메뉴에 넣을 프렙을 고르는 창 */
export function PrepPicker({
  open,
  preps,
  ingredientMap,
  onClose,
  onSelect,
}: {
  open: boolean;
  preps: Prep[];
  ingredientMap: Map<string, Ingredient>;
  onClose: () => void;
  onSelect: (prep: Prep) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return preps;
    return preps.filter((p) => p.name.toLowerCase().includes(q));
  }, [preps, keyword]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="프렙 선택"
      description="미리 만들어둔 양념장·육수를 메뉴에 넣습니다. 사용한 양만큼만 원가에 반영됩니다."
    >
      <TextField
        placeholder="프렙 이름 검색"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        autoFocus
      />
      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            title="프렙이 없습니다"
            description="프렙 화면에서 양념장·육수를 먼저 등록해보세요."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((prep) => {
              const unitCost = prepUnitCost(prep, ingredientMap);
              return (
                <li key={prep.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(prep);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-ink-900">{prep.name}</span>
                      <span className="tnum block text-sm text-ink-500">
                        총 생산량 {prep.yieldAmount}
                        {prep.yieldUnit}
                      </span>
                    </span>
                    {unitCost ? (
                      <span className="tnum shrink-0 text-sm font-bold text-brand-600">
                        1{unitCost.unit}당 {formatUnitCost(unitCost.value)}원
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** 메뉴에 넣을 부자재를 고르는 창 */
export function SupplyPicker({
  open,
  supplies,
  onClose,
  onSelect,
}: {
  open: boolean;
  supplies: Supply[];
  onClose: () => void;
  onSelect: (supply: Supply) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return supplies;
    return supplies.filter((s) => s.name.toLowerCase().includes(q));
  }, [supplies, keyword]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="부자재 선택"
      description="포장용기·젓가락 등 메뉴와 함께 나가는 소모품을 넣습니다."
    >
      <TextField
        placeholder="부자재 이름 검색"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        autoFocus
      />
      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            title="부자재가 없습니다"
            description="부자재 화면에서 포장용기·젓가락 등을 먼저 등록해보세요."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((supply) => {
              const unitCost = computeUnitCost(supply.price, supply.quantity, supply.unit);
              return (
                <li key={supply.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(supply);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-left transition-colors hover:border-sky-300 hover:bg-sky-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-ink-900">{supply.name}</span>
                      <span className="tnum block text-sm text-ink-500">
                        {formatWon(supply.price)} / {supply.quantity}
                        {supply.unit}
                      </span>
                    </span>
                    {unitCost ? (
                      <span className="tnum shrink-0 text-sm font-bold text-sky-700">
                        1{unitCost.unit}당 {formatUnitCost(unitCost.value)}원
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
