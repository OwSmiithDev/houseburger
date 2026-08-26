import { Check, Minus, Plus } from 'lucide-react';
import type { CartLine, OptionGroup } from '@/types/order';
import { totalMarcado } from '@/lib/pricing';
import { formatPrice } from '@/lib/format';
import { Pill } from '@/components/base/primitives';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface OptionGroupFieldProps {
  group: OptionGroup;
  selections: CartLine['selections'];
  onChange: (groupId: string, optionId: string, quantity: number) => void;
}

/**
 * Um grupo de personalização.
 *
 * Escolha única (max 1) vira rádio; múltipla, contador por opção. O estado do
 * grupo aparece no cabeçalho: "Obrigatório" enquanto falta, "Concluído" quando
 * o mínimo foi atingido — a mesma leitura das referências.
 */
export const OptionGroupField = ({
  group,
  selections,
  onChange,
}: OptionGroupFieldProps) => {
  const marcado = totalMarcado(selections, group.id);
  const obrigatorio = group.min > 0;
  const satisfeito = marcado >= group.min;
  const cheio = marcado >= group.max;
  const escolhaUnica = group.max === 1;

  const legenda = escolhaUnica
    ? 'Selecione 1'
    : group.min > 0
      ? `Selecione de ${group.min} a ${group.max}`
      : `Até ${group.max} opções`;

  const alternar = (optionId: string, atual: number) => {
    if (escolhaUnica) {
      haptic('light');
      // Em escolha única, marcar uma opção desmarca as demais do grupo.
      for (const o of group.options) {
        if (o.id !== optionId && (selections[group.id]?.[o.id] ?? 0) > 0) {
          onChange(group.id, o.id, 0);
        }
      }
      onChange(group.id, optionId, atual > 0 ? 0 : 1);
      return;
    }

    if (atual > 0) {
      haptic('light');
      onChange(group.id, optionId, atual - 1);
      return;
    }
    if (cheio) return;
    haptic('light');
    onChange(group.id, optionId, 1);
  };

  return (
    <fieldset className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <div className="min-w-0">
          <legend className="text-sm font-bold uppercase tracking-wide text-foreground">
            {group.name}
          </legend>
          <p className="text-xs text-muted-foreground">{legenda}</p>
        </div>

        {obrigatorio &&
          (satisfeito ? (
            <Pill tone="done">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              Concluído
            </Pill>
          ) : (
            <Pill tone="required">Obrigatório</Pill>
          ))}
      </div>

      <div role={escolhaUnica ? 'radiogroup' : undefined} aria-label={group.name}>
        {group.options.map((option) => {
          const quantidade = selections[group.id]?.[option.id] ?? 0;
          const marcadoAqui = quantidade > 0;
          const bloqueado =
            option.soldOut || (!marcadoAqui && cheio && !escolhaUnica);

          return (
            <div
              key={option.id}
              className={cn(
                'flex items-center gap-3 border-b border-border px-4 py-1 last:border-b-0',
                option.soldOut && 'opacity-45',
              )}
            >
              <div className="min-w-0 flex-1 py-2">
                <p
                  className={cn(
                    'text-sm text-foreground',
                    option.soldOut && 'line-through',
                  )}
                >
                  {option.name}
                </p>
                {option.priceDelta !== 0 && (
                  <p className="text-xs font-semibold text-muted-foreground">
                    {option.priceDelta > 0 ? '+ ' : '- '}
                    {formatPrice(Math.abs(option.priceDelta))}
                  </p>
                )}
                {option.soldOut && (
                  <p className="text-xs text-muted-foreground">Indisponível</p>
                )}
              </div>

              {escolhaUnica ? (
                <button
                  type="button"
                  role="radio"
                  aria-checked={marcadoAqui}
                  disabled={bloqueado}
                  onClick={() => alternar(option.id, quantidade)}
                  aria-label={option.name}
                  className="press-sm tap-target flex items-center justify-center rounded-full disabled:cursor-not-allowed"
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                      marcadoAqui
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/40',
                    )}
                  >
                    {marcadoAqui && (
                      <Check
                        className="h-3.5 w-3.5 text-primary-foreground"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  {marcadoAqui && (
                    <button
                      type="button"
                      onClick={() => alternar(option.id, quantidade)}
                      aria-label={`Remover ${option.name}`}
                      className="press-sm tap-target flex items-center justify-center rounded-full text-foreground"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  {marcadoAqui && (
                    <span className="min-w-5 text-center text-sm font-bold tabular-nums text-foreground">
                      {quantidade}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={bloqueado}
                    onClick={() => {
                      if (bloqueado) return;
                      haptic('light');
                      onChange(group.id, option.id, quantidade + 1);
                    }}
                    aria-label={`Adicionar ${option.name}`}
                    className={cn(
                      'press-sm tap-target flex items-center justify-center rounded-full',
                      bloqueado
                        ? 'cursor-not-allowed text-muted-foreground/40'
                        : 'text-primary',
                    )}
                  >
                    <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
};
