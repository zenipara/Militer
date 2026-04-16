import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  children: ReactNode;
}

const variants = {
  primary: 'bg-primary text-white shadow-sm shadow-primary/35 hover:bg-blue-600',
  secondary: 'border border-surface bg-slate-50 text-text-primary hover:bg-slate-100 dark:bg-surface/60 dark:hover:bg-surface',
  danger: 'bg-accent-red text-white shadow-sm shadow-accent-red/30 hover:bg-red-600',
  ghost: 'text-text-muted hover:bg-slate-100 hover:text-text-primary dark:hover:bg-surface/60',
  outline: 'border border-surface bg-transparent text-text-primary hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
};

const sizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-2 focus:ring-offset-transparent
        disabled:cursor-not-allowed disabled:opacity-50
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      {children}
    </button>
  );
}
