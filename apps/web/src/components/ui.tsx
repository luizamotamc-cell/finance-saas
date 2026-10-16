import {
  ButtonHTMLAttributes, forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useEffect,
} from 'react';

type Variant = 'primary' | 'ghost' | 'text' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  ghost: 'border border-line bg-white text-ink hover:bg-brand-soft',
  text: 'text-ink hover:bg-brand-soft',
  danger: 'text-expense hover:bg-red-50',
};

const sizes = { md: 'px-4 py-2', sm: 'px-2.5 py-1' };

export function Button({
  variant = 'primary', size = 'md', className = '', ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'sm' }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
    />
  );
}

const field = 'w-full rounded-md border border-line bg-white px-3 py-2 text-sm placeholder:text-muted/70';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...p }, ref) => <input ref={ref} {...p} className={`${field} ${className}`} />,
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', ...p }, ref) => <select ref={ref} {...p} className={`${field} ${className}`} />,
);

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-expense">{error}</span>}
    </label>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  return children ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-expense">{children}</p> : null;
}

export function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-6 sm:rounded-xl"
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-muted">{children}</p>;
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.1fr]">
      <div className="hidden bg-brand p-12 text-white md:flex md:flex-col md:justify-between">
        <span className="text-xl font-bold">Caixa</span>
        <p className="max-w-sm text-3xl font-semibold leading-snug">
          Saiba para onde vai cada real, sem planilha.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
