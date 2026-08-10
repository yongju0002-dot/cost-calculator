'use client';

import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { applyThousandSeparator } from '@/lib/domain/money';
import { IconCheck, IconEye, IconEyeOff } from './Icons';

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

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  fieldClassName?: string;
}

/** 비밀번호 입력 필드. 눈 아이콘으로 입력값을 확인할 수 있다. */
export function PasswordField({
  label,
  hint,
  error,
  className = '',
  fieldClassName = '',
  id,
  ...props
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={fieldClassName}>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`${BASE_INPUT} h-11 pr-11 ${error ? 'border-red-300' : 'border-ink-200'} ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
        >
          {visible ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
        </button>
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

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: ReactNode;
  error?: string | null;
}

/** 약관 동의 등에 쓰는 체크박스. 기본 체크박스 대신 브랜드 색으로 통일한다. */
export function Checkbox({ label, error, className = '', id, checked, ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-2.5">
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            className="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none rounded-md border border-ink-300 bg-white transition-colors checked:border-brand-500 checked:bg-brand-500"
            {...props}
          />
          <IconCheck
            width={13}
            height={13}
            strokeWidth={3}
            className="pointer-events-none text-white opacity-0 peer-checked:opacity-100"
          />
        </span>
        <span className="text-sm leading-relaxed text-ink-600">{label}</span>
      </label>
      {error ? <p className="mt-1 pl-7 text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
