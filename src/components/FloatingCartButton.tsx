import { ShoppingCart } from 'lucide-react';
import { CartItem } from '@/types/order';
import { formatPrice } from '@/lib/format';

interface FloatingCartButtonProps {
  items: CartItem[];
  onClick: () => void;
}

export const FloatingCartButton = ({ items, onClick }: FloatingCartButtonProps) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  if (totalItems === 0) return null;

  return (
    /* bottom-safe em vez de bottom-6: no iPhone com indicador de gestos e no
       Android com barra de navegação, um bottom fixo joga o CTA embaixo da
       chrome do sistema. O pulse-glow infinito saiu — animação decorativa em
       loop compete com o conteúdo e não passa no critério de motion. */
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver carrinho: ${totalItems} ${
        totalItems === 1 ? 'item' : 'itens'
      }, total ${formatPrice(total)}`}
      className="gradient-hero press animate-slide-up bottom-safe fixed left-4 right-4 z-40 flex items-center justify-between rounded-2xl px-5 py-4 text-primary-foreground shadow-button"
    >
      <span className="flex items-center gap-3">
        <span className="relative">
          <ShoppingCart className="h-6 w-6" aria-hidden="true" />
          <span
            key={totalItems}
            className="animate-pop absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-xs font-bold text-secondary-foreground"
          >
            {totalItems}
          </span>
        </span>
        <span className="font-bold">Ver Carrinho</span>
      </span>

      <span className="text-lg font-extrabold tabular-nums">
        {formatPrice(total)}
      </span>
    </button>
  );
};
