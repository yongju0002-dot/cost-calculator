import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-ink-200 bg-white shadow-card ${
        padded ? 'p-5 sm:p-6' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  description,
  action,
}: {
  children: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink-900">{children}</h2>
        {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
