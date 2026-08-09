'use client';

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { applyThousandSeparator } from '@/lib/domain/money';

const BASE_INPUT =
  'w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50 disabled:text-ink-400';

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className = '',
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  suffix?: string;
  fieldClassName?: string;
}

export function TextField({
  label,
  hint,
  error,
  suffix,
  className = '',
  fieldClassName = '',
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={fieldClassName}>
      <div className="relative">
        <input
          id={inputId}
          className={`${BASE_INPUT} h-11 ${error ? 'border-red-300' : 'border-ink-200'} ${
            suffix ? 'pr-10' : ''
          } ${className}`}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </Field>
  );
}

interface NumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  suffix?: string;
  /** 화면에 보이는 문자열 (콤마 포함) */
  value: string;
  onValueChange: (raw: string) => void;
  /** 천 단위 콤마 적용 여부 */
  separator?: boolean;
  fieldClassName?: string;
}

/**
 * 숫자 입력 필드.
 * - 모바일에서 숫자 키패드가 뜨도록 inputMode="decimal"
 * - 입력하는 즉시 천 단위 콤마 적용
 */
export function NumberField({
  label,
  hint,
  error,
  suffix,
  value,
  onValueChange,
  separator = true,
  className = '',
  fieldClassName = '',
  id,
  ...props
}: NumberFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={fieldClassName}>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) =>
            onValueChange(
              separator
                ? applyThousandSeparator(event.target.value)
                : event.target.value.replace(/[^\d.]/g, ''),
            )
          }
          className={`tnum ${BASE_INPUT} h-11 text-right font-semibold ${
            error ? 'border-red-300' : 'border-ink-200'
          } ${suffix ? 'pr-9' : ''} ${className}`}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </Field>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  fieldClassName?: string;
}

export function SelectField({
  label,
  hint,
  error,
  className = '',
  fieldClassName = '',
  id,
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={selectId} className={fieldClassName}>
      <select
        id={selectId}
        className={`${BASE_INPUT} h-11 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_0.75rem_center] bg-no-repeat pr-10 ${
          error ? 'border-red-300' : 'border-ink-200'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}
