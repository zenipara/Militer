import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  helpText?: string;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  helpText,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
          {props.required && <span className="text-accent-red ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`
            w-full rounded-lg border bg-bg-card px-3 py-2.5 text-text-primary
            placeholder:text-text-muted
            border-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-accent-red focus:border-accent-red focus:ring-accent-red/50' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-accent-red">{error}</p>}
      {helpText && !error && <p className="text-xs text-text-muted">{helpText}</p>}
    </div>
  );
}
