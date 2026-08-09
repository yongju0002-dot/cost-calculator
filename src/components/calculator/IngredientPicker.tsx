'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ingredientUnitCost } from '@/lib/domain/cost';
import { formatUnitCost, formatWon } from '@/lib/domain/money';
import type { Ingredient } from '@/lib/domain/types';

export function IngredientPicker({
  open,
  ingredients,
  onClose,
  onSelect,
}: {
  open: boolean;
  ingredients: Ingredient[];
  onClose: () => void;
  onSelect: (ingredient: Ingredient) => void;
}) {
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, keyword]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="내 재료에서 선택"
      description="저장해 둔 재료를 불러오면 가격이 바뀔 때 메뉴 원가도 자동으로 갱신됩니다."
    >
      <TextField
        placeholder="재료명 검색"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        autoFocus
      />
      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState title="재료가 없습니다" description="내 재료 화면에서 자주 쓰는 식재료를 먼저 등록해보세요." />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((ingredient) => {
              const unitCost = ingredientUnitCost(ingredient);
              return (
                <li key={ingredient.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(ingredient);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span>
                      <span className="block font-bold text-ink-900">{ingredient.name}</span>
                      <span className="tnum block text-sm text-ink-500">
                        {formatWon(ingredient.price)} / {ingredient.quantity}
                        {ingredient.unit}
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
