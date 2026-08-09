'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, COST_RATE_TEXT, COST_RATE_TONE } from '@/components/ui/Badge';
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
import { useAuth } from '@/lib/auth/auth';
import { useData } from '@/lib/store/data';
import { formatPercent, formatPercentDelta, formatWon, formatWonDelta } from '@/lib/domain/money';
import type { Menu } from '@/lib/domain/types';

export function MenusClient() {
  const { user, ready: authReady } = useAuth();
  const { menuViews, duplicateMenu, removeMenu, loadSampleData } = useData();
  const { showToast } = useToast();

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('전체');
  const [deleting, setDeleting] = useState<Menu | null>(null);

  const usedCategories = useMemo(() => {
    const set = new Set(menuViews.map((view) => view.menu.category));
    return ['전체', ...Array.from(set)];
  }, [menuViews]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return menuViews.filter((view) => {
      const matchesKeyword = !q || view.menu.name.toLowerCase().includes(q);
      const matchesCategory = category === '전체' || view.menu.category === category;
      return matchesKeyword && matchesCategory;
    });
  }, [menuViews, keyword, category]);

  if (!authReady) return null;
  if (!user) {
    return (
      <LoginGate
        title="내 메뉴는 로그인 후 사용할 수 있어요"
        description="계산한 메뉴를 저장해 두면 원가율과 원가 변동을 계속 관리할 수 있습니다."
        next="/menus"
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">내 메뉴</h1>
          <p className="mt-1.5 text-[15px] text-ink-500">
            저장한 메뉴 {menuViews.length}개의 원가와 원가율을 관리합니다.
          </p>
        </div>
        <Link href="/calculator" className={buttonClass('primary', 'md')}>
          <IconPlus width={18} height={18} />
          메뉴 원가 계산
        </Link>
      </div>

      {menuViews.length > 0 ? (
        <>
          <div className="relative mt-6">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" width={18} height={18} />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="메뉴명으로 검색"
              className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-11 pr-4 text-[15px] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {usedCategories.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-bold transition-colors ${
                  category === name
                    ? 'bg-ink-900 text-white'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="mt-5">
        {menuViews.length === 0 ? (
          <EmptyState
            icon="🍚"
            title="저장된 메뉴가 없습니다"
            description="원가 계산기에서 메뉴를 계산한 뒤 저장하면 이곳에서 관리할 수 있습니다."
            action={
              <>
                <Link href="/calculator" className={buttonClass('primary', 'md')}>
                  메뉴 원가 계산하기
                </Link>
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
          <EmptyState title="검색 결과가 없습니다" description="다른 검색어나 카테고리를 선택해보세요." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((view) => (
              <li key={view.menu.id}>
                <Card className="flex h-full flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge>{view.menu.category}</Badge>
                        <h2 className="mt-2 text-[19px] font-extrabold text-ink-900">{view.menu.name}</h2>
                      </div>
                      {view.level ? (
                        <div className="text-right">
                          <p className={`tnum text-2xl font-extrabold ${COST_RATE_TEXT[view.level.id]}`}>
                            {view.costRate === null ? '-' : formatPercent(view.costRate)}
                          </p>
                          <Badge tone={COST_RATE_TONE[view.level.id]}>{view.level.label}</Badge>
                        </div>
                      ) : null}
                    </div>

                    <dl className="mt-4 flex flex-col gap-1.5 text-[15px]">
                      <div className="flex justify-between">
                        <dt className="text-ink-500">재료 원가</dt>
                        <dd className="tnum font-bold text-ink-900">{formatWon(view.cost)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-500">판매가격</dt>
                        <dd className="tnum font-bold text-ink-900">{formatWon(view.menu.sellingPrice)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-500">재료비 제외 금액</dt>
                        <dd className="tnum font-bold text-ink-900">
                          {view.margin === null ? '-' : formatWon(view.margin)}
                        </dd>
                      </div>
                    </dl>

                    {view.change ? (
                      <div
                        className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                          view.change.direction === 'up'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {view.change.direction === 'up' ? (
                          <IconArrowUp width={16} height={16} />
                        ) : (
                          <IconArrowDown width={16} height={16} />
                        )}
                        <span className="tnum">
                          지난 원가 {formatWon(view.change.previous)} → {formatWon(view.change.current)} (
                          {formatWonDelta(view.change.diff)}, {formatPercentDelta(view.change.rate)})
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/calculator/${view.menu.id}`}
                      className={buttonClass('secondary', 'sm')}
                    >
                      <IconEdit width={16} height={16} />
                      수정
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const copy = duplicateMenu(view.menu.id);
                        if (copy) showToast(`'${copy.name}'을(를) 만들었습니다.`, 'success');
                      }}
                    >
                      <IconCopy width={16} height={16} />
                      복사
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleting(view.menu)}>
                      <IconTrash width={16} height={16} />
                      삭제
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title="메뉴를 삭제할까요?"
        message={
          deleting ? (
            <>
              <b>{deleting.name}</b> 메뉴와 원가 기록이 함께 삭제됩니다. 삭제한 메뉴는 되돌릴 수 없습니다.
            </>
          ) : null
        }
        onConfirm={() => {
          if (!deleting) return;
          removeMenu(deleting.id);
          showToast(`'${deleting.name}' 메뉴를 삭제했습니다.`);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
