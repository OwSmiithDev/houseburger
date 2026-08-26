import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Em `min`, o botão de diminuir vira lixeira e chama `onRemove`. */
  onRemove?: () => void;
  label: string;
  size?: 'sm' | 'md';
}

/**
 * Controle de quantidade. Alvos de 44px mesmo na variante pequena — é o
 * controle mais tocado do aplicativo.
 */
export const Stepper = ({
  value,
  onChange,
  min = 1,
  max = 99,
  onRemove,
  label,
  size = 'md',
}: StepperProps) => {
  const noMinimo = value <= min;
  const podeRemover = noMinimo && Boolean(onRemove);
  const botao = size === 'sm' ? 'h-11 w-11' : 'h-12 w-12';

  const diminuir = () => {
    if (podeRemover) {
      haptic('warning');
      onRemove?.();
      return;
    }
    if (noMinimo) return;
    haptic('light');
    onChange(value - 1);
  };

  const aumentar = () => {
    if (value >= max) return;
    haptic('light');
    onChange(value + 1);
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1 rounded-full bg-muted p-1"
    >
      <button
        type="button"
        onClick={diminuir}
        disabled={noMinimo && !podeRemover}
        aria-label={podeRemover ? `Remover ${label}` : `Diminuir ${label}`}
        className={cn(
          'press-sm flex items-center justify-center rounded-full transition-colors',
          botao,
          noMinimo && !podeRemover
            ? 'cursor-not-allowed text-muted-foreground/50'
            : podeRemover
              ? 'text-destructive'
              : 'text-foreground',
        )}
      >
        {podeRemover ? (
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Minus className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      <span
        key={value}
        aria-live="polite"
        className="animate-pop min-w-7 text-center text-base font-bold tabular-nums text-foreground"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={aumentar}
        disabled={value >= max}
        aria-label={`Aumentar ${label}`}
        className={cn(
          'press-sm flex items-center justify-center rounded-full transition-colors',
          botao,
          value >= max
            ? 'cursor-not-allowed bg-muted text-muted-foreground/50'
            : 'bg-primary text-primary-foreground',
        )}
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
};
