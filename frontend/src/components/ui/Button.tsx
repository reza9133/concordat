// ============================================================
// Button — versatile button with variants, loading, disabled
// ============================================================

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-brand text-white shadow-primary hover:shadow-primary-lg hover:opacity-90 active:opacity-80',
  secondary:
    'bg-secondary text-white hover:bg-secondary/90 active:bg-secondary/80',
  outline:
    'border-2 border-primary text-primary bg-transparent hover:bg-primary/5 active:bg-primary/10',
  ghost:
    'text-text-secondary bg-transparent hover:bg-background hover:text-text-primary active:bg-border',
  danger:
    'bg-danger text-white hover:bg-danger/90 active:bg-danger/80',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

const SPINNER_SIZE: Record<ButtonSize, 'sm' | 'sm' | 'md'> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl
        transition-all duration-200 select-none
        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner
          variant="spinner"
          size={SPINNER_SIZE[size]}
          color={variant === 'outline' || variant === 'ghost' ? 'primary' : 'white'}
        />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
