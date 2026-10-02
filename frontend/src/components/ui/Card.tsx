// ============================================================
// Card — glass card with optional gradient border
// ============================================================

import { ReactNode, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  gradientBorder?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'article' | 'section';
}

interface CardSectionProps {
  children: ReactNode;
  className?: string;
}

const PADDING_MAP = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Card({
  children,
  hover = false,
  gradientBorder = false,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const baseClass = `
    bg-white rounded-2xl border border-border shadow-card
    ${PADDING_MAP[padding]}
    ${hover ? 'transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer' : ''}
    ${gradientBorder ? 'gradient-border' : ''}
    ${className}
  `;

  if (hover) {
    return (
      <motion.div
        className={baseClass}
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        {...(props as Parameters<typeof motion.div>[0])}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClass} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardSectionProps) {
  return (
    <div className={`pb-4 mb-4 border-b border-border ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardSectionProps) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardSectionProps) {
  return (
    <div className={`pt-4 mt-4 border-t border-border ${className}`}>
      {children}
    </div>
  );
}
