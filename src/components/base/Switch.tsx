import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

/**
 * Interruptor de liga/desliga.
 *
 * Construído sobre o Radix, que já é dependência do projeto, em vez do
 * componente do shadcn — este segue as cores e o alvo de toque do resto do
 * aplicativo, e o do shadcn saiu junto com os outros 45 que ninguém importava.
 *
 * O rótulo faz parte do componente de propósito: um interruptor sozinho não
 * diz o que liga, e quem usa leitor de tela ouviria só "ligado". O conjunto
 * inteiro é a área de toque, o que também ajuda quem clica com o polegar.
 */
export const Switch = ({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) => (
  <label
    className={cn(
      'flex min-h-11 cursor-pointer select-none items-center gap-2',
      disabled && 'cursor-not-allowed opacity-60',
      className,
    )}
  >
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'peer relative h-6 w-11 shrink-0 rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block h-5 w-5 rounded-full bg-card shadow-sm transition-transform',
          'translate-x-0.5 data-[state=checked]:translate-x-[1.375rem]',
        )}
      />
    </SwitchPrimitive.Root>
    <span
      className={cn(
        'text-xs font-bold',
        checked ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
    </span>
  </label>
);
