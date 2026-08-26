import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { usePersistentCart } from '@/hooks/use-persistent-cart';
import { contarItens, resolverCarrinho, type LinhaResolvida } from '@/lib/pricing';
import type { Catalog } from '@/types/order';

/**
 * A sacola precisa ser única no aplicativo.
 *
 * Com as telas viradas rotas, chamar o hook direto em cada página criaria uma
 * cópia independente do estado: adicionar na página do produto e não ver nada
 * na sacola.
 *
 * O provider fica abaixo do `CatalogGate` de propósito: sem catálogo carregado
 * não há como validar o que estava salvo nem calcular preço.
 */
type CartApi = ReturnType<typeof usePersistentCart> & {
  catalog: Catalog;
  /** Linhas já resolvidas contra o catálogo, com preços calculados. */
  linhas: LinhaResolvida[];
  totalItens: number;
};

const CartContext = createContext<CartApi | null>(null);

export const CartProvider = ({
  catalog,
  children,
}: {
  catalog: Catalog;
  children: ReactNode;
}) => {
  const cart = usePersistentCart(catalog);

  const value = useMemo<CartApi>(() => {
    const linhas = resolverCarrinho(catalog, cart.lines);
    return { ...cart, catalog, linhas, totalItens: contarItens(cart.lines) };
  }, [cart, catalog]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartApi => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>');
  return ctx;
};
