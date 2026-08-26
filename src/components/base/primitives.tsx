import type { ReactNode } from 'react';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Valor em reais com dígitos de largura fixa, para colunas não dançarem. */
export const Money = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => <span className={cn('tabular-nums', className)}>{formatPrice(value)}</span>;

/** Cartão branco padrão das telas. */
export const SectionCard = ({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <section className={cn('surface p-4', className)} {...rest}>
    {children}
  </section>
);

type PillTone = 'neutral' | 'required' | 'done' | 'offer' | 'saving';

const tons: Record<PillTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  required: 'bg-secondary/20 text-secondary-foreground',
  done: 'bg-success/15 text-success',
  offer: 'bg-primary text-primary-foreground',
  saving: 'bg-success/15 text-success',
};

/** Selo curto: "Obrigatório", "Concluído", "OFERTA". */
export const Pill = ({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: PillTone;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-5',
      tons[tone],
      className,
    )}
  >
    {children}
  </span>
);

/** Título de seção com ação opcional à direita. */
export const SectionTitle = ({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
    <h2 className="text-lg font-bold text-foreground">{children}</h2>
    {action}
  </div>
);
