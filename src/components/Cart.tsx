import { ArrowRight, ShoppingCart } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer';
import { CartItem as CartItemType } from '@/types/order';
import { CartItem } from './CartItem';
import { formatPrice } from '@/lib/format';
import { haptic } from '@/lib/haptics';

interface CartProps {
  items: CartItemType[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

export const Cart = ({
  items,
  isOpen,
  onClose,
  onUpdateQuantity,
  onUpdateNotes,
  onRemove,
  onCheckout,
}: CartProps) => {
  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    /* Drawer (vaul) no lugar do overlay manual: entrega arrastar-para-fechar,
       trava de rolagem do fundo, foco preso e fechamento por Esc — tudo isso
       faltava na implementação anterior com <div fixed>. */
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[88vh] border-border">
        <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-2">
          <div className="gradient-hero flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <ShoppingCart className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
          </div>
          <div className="text-left">
            <DrawerTitle className="text-lg font-bold text-foreground">
              Seu Pedido
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </DrawerDescription>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <ShoppingCart
              className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="text-foreground">Seu carrinho está vazio</p>
            <p className="text-sm text-muted-foreground">
              Escolha algo delicioso no cardápio
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-3 overflow-y-auto overscroll-contain p-4">
              {items.map((item) => (
                <CartItem
                  key={item.product.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onUpdateNotes={onUpdateNotes}
                  onRemove={onRemove}
                />
              ))}
            </ul>

            <div className="border-t border-border bg-background px-4 pb-safe pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-muted-foreground">Total do Pedido</span>
                <span className="text-gradient text-2xl font-extrabold tabular-nums">
                  {formatPrice(total)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  haptic('success');
                  onCheckout();
                }}
                className="gradient-hero press mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-bold text-primary-foreground shadow-button"
              >
                <span>Finalizar Pedido</span>
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};
