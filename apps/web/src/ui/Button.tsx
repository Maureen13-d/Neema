import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

/** Large-tap Neema button. */
export function Button({
  variant = 'primary',
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
