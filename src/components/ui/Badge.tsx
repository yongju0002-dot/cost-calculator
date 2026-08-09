import type { ReactNode } from 'react';
import type { CostRateLevelId } from '@/lib/domain/cost';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-600',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-sky-50 text-sky-700',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export const COST_RATE_TONE: Record<CostRateLevelId, BadgeTone> = {
  low: 'success',
  normal: 'info',
  high: 'warning',
  veryHigh: 'danger',
};

/** 원가율 강조 표시에 쓰는 색상 (텍스트/배경) */
export const COST_RATE_TEXT: Record<CostRateLevelId, string> = {
  low: 'text-emerald-600',
  normal: 'text-sky-600',
  high: 'text-amber-600',
  veryHigh: 'text-red-600',
};

export const COST_RATE_BAR: Record<CostRateLevelId, string> = {
  low: 'bg-emerald-500',
  normal: 'bg-sky-500',
  high: 'bg-amber-500',
  veryHigh: 'bg-red-500',
};
