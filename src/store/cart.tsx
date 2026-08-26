import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { usePersistentCart } from '@/hooks/use-persistent-cart';
import { contarItens, resolverCarrinho, type LinhaResolvida } from '@/lib/pricing';

/**
 * O carrinho precisa ser único no aplicativo.
 *
 * Com as telas viradas rotas, chamar o hook direto em cada página criaria uma
 * cópia independente do estado: adicionar na página do produto e não ver nada
 * na sacola. O provider garante uma instância só, e é ele quem grava no
 * armazenamento local.
 */
type CartApi = ReturnType<typeof usePersistentCart> & {
  /** Linhas já resolvidas contra o catálogo, com preços calculados. */
  linhas: LinhaResolvida[];
  totalItens: number;
};

const CartContext = createContext<CartApi | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const cart = usePersistentCart();

  const value = useMemo<CartApi>(() => {
    const linhas = resolverCarrinho(cart.lines);
    return { ...cart, linhas, totalItens: contarItens(cart.lines) };
  }, [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartApi => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>');
  return ctx;
};
