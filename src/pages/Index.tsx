import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { CategoryTabs } from '@/components/CategoryTabs';
import { ProductCard } from '@/components/ProductCard';
import { Cart } from '@/components/Cart';
import { FloatingCartButton } from '@/components/FloatingCartButton';
import { CheckoutFlow } from '@/components/CheckoutFlow';
import { products } from '@/data/products';
import { Category, CartItem, Product } from '@/types/order';

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('promos');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const filteredProducts = useMemo(
    () => products.filter((product) => product.category === activeCategory),
    [activeCategory],
  );

  /** Quantidade por produto, para o card mostrar stepper em vez de "Adicionar" */
  const quantityByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      map[item.product.id] = item.quantity;
    }
    return map;
  }, [cartItems]);

  /** Itens por categoria, para o contador no chip de navegação */
  const countByCategory = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    for (const item of cartItems) {
      const category = item.product.category as Category;
      map[category] = (map[category] ?? 0) + item.quantity;
    }
    return map;
  }, [cartItems]);

  const addToCart = useCallback((product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1, notes: '' }];
    });
    // Sem toast a cada toque: o card já mostra o selo de quantidade e o botão
    // flutuante atualiza o total. Notificação repetida vira ruído no celular.
  }, []);

  const removeOneFromCart = useCallback((product: Product) => {
    setCartItems((prev) =>
      prev.flatMap((item) => {
        if (item.product.id !== product.id) return item;
        return item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : [];
      }),
    );
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.product.id !== id));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.product.id === id ? { ...item, quantity } : item)),
    );
  }, []);

  const updateNotes = useCallback((id: string, notes: string) => {
    setCartItems((prev) =>
      prev.map((item) => (item.product.id === id ? { ...item, notes } : item)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setCartItems((prev) => {
      const removed = prev.find((item) => item.product.id === id);
      const next = prev.filter((item) => item.product.id !== id);

      // Ação destrutiva merece confirmação com desfazer — no celular é fácil
      // tocar na lixeira sem querer.
      if (removed) {
        toast('Item removido', {
          description: removed.product.name,
          action: {
            label: 'Desfazer',
            onClick: () => setCartItems((current) => [...current, removed]),
          },
        });
      }

      return next;
    });
  }, []);

  const handleCategoryChange = useCallback((category: Category) => {
    setActiveCategory(category);
    // Volta ao topo da grade: sem isso, trocar de categoria com a página
    // rolada deixa o usuário no meio de uma lista nova.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCheckoutComplete = useCallback(() => {
    setIsCheckoutOpen(false);
    setCartItems([]);
    toast.success('Pedido enviado com sucesso!');
  }, []);

  return (
    // data-vaul-drawer-wrapper habilita o recuo do fundo quando o carrinho
    // abre — a pista visual de profundidade dos bottom sheets nativos.
    <div
      data-vaul-drawer-wrapper=""
      className="min-h-screen bg-background pb-cta"
    >
      <Header />

      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        countByCategory={countByCategory}
      />

      <main
        id="painel-produtos"
        role="tabpanel"
        aria-labelledby={`tab-${activeCategory}`}
        className="px-safe py-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={quantityByProduct[product.id] ?? 0}
              onAdd={addToCart}
              onRemoveOne={removeOneFromCart}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <p className="py-12 text-center text-lg text-muted-foreground">
            Nenhum produto nesta categoria
          </p>
        )}
      </main>

      <FloatingCartButton items={cartItems} onClick={() => setIsCartOpen(true)} />

      <Cart
        items={cartItems}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateQuantity}
        onUpdateNotes={updateNotes}
        onRemove={removeItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {isCheckoutOpen && (
        <CheckoutFlow
          items={cartItems}
          onBack={() => {
            setIsCheckoutOpen(false);
            setIsCartOpen(true);
          }}
          onComplete={handleCheckoutComplete}
        />
      )}
    </div>
  );
};

export default Index;
