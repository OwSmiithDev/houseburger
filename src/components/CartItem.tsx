import { useState } from 'react';
import { Minus, NotebookPen, Plus, Trash2, X } from 'lucide-react';
import { CartItem as CartItemType } from '@/types/order';
import { formatPrice } from '@/lib/format';
import { haptic } from '@/lib/haptics';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onRemove: (id: string) => void;
}

export const CartItem = ({
  item,
  onUpdateQuantity,
  onUpdateNotes,
  onRemove,
}: CartItemProps) => {
  const [showNotes, setShowNotes] = useState(Boolean(item.notes));
  const { product, quantity, notes } = item;
  const isLast = quantity === 1;
  const notesId = `obs-${product.id}`;

  const handleDecrease = () => {
    haptic(isLast ? 'warning' : 'light');
    onUpdateQuantity(product.id, quantity - 1);
  };

  const handleIncrease = () => {
    haptic('light');
    onUpdateQuantity(product.id, quantity + 1);
  };

  return (
    <li className="animate-slide-down list-none rounded-xl bg-card p-3">
      <div className="flex gap-3">
        <img
          src={product.image}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          className="h-20 w-20 shrink-0 rounded-lg bg-muted object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate font-bold text-foreground">{product.name}</h4>

            <button
              type="button"
              onClick={() => {
                haptic('warning');
                onRemove(product.id);
              }}
              aria-label={`Remover ${product.name} do carrinho`}
              className="press-sm -mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <p className="truncate text-sm text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-gradient font-bold">
              {formatPrice(product.price * quantity)}
            </span>

            <div
              className="flex items-center gap-1 rounded-full bg-muted p-1"
              role="group"
              aria-label={`Quantidade de ${product.name}`}
            >
              {/* Em 1 unidade o "menos" vira lixeira: comunica que o próximo
                  toque remove o item, em vez de zerar silenciosamente. */}
              <button
                type="button"
                onClick={handleDecrease}
                aria-label={
                  isLast
                    ? `Remover ${product.name} do carrinho`
                    : `Diminuir quantidade de ${product.name}`
                }
                className={`press-sm flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                  isLast ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {isLast ? (
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Minus className="h-5 w-5" aria-hidden="true" />
                )}
              </button>

              <span
                key={quantity}
                aria-live="polite"
                className="animate-pop min-w-6 text-center font-bold tabular-nums text-foreground"
              >
                {quantity}
              </span>

              <button
                type="button"
                onClick={handleIncrease}
                aria-label={`Aumentar quantidade de ${product.name}`}
                className="gradient-hero press-sm flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Divulgação progressiva: o campo de observação só aparece quando pedido,
          mantendo a lista escaneável em telas pequenas. */}
      <div className="mt-2">
        {showNotes ? (
          <div className="animate-slide-down">
            <label htmlFor={notesId} className="mb-1 block text-xs font-semibold text-muted-foreground">
              Observação para a cozinha
            </label>
            <textarea
              id={notesId}
              rows={2}
              maxLength={200}
              autoFocus={!notes}
              placeholder="Ex.: sem cebola, ponto bem passado"
              value={notes}
              onChange={(event) => onUpdateNotes(product.id, event.target.value)}
              className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="press-sm flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground"
          >
            <NotebookPen className="h-4 w-4" aria-hidden="true" />
            <span>Adicionar observação</span>
          </button>
        )}
      </div>
    </li>
  );
};
