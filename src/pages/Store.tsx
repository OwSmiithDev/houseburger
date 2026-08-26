import { useMemo, useState } from 'react';
import { Search, ShoppingBag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StoreHero } from '@/components/store/StoreHero';
import { CategoryChips } from '@/components/store/CategoryChips';
import { FeaturedCarousel } from '@/components/store/FeaturedCarousel';
import { ProductRow } from '@/components/store/ProductRow';
import { BarButton, BottomBar } from '@/components/base/BottomBar';
import { Money, SectionTitle } from '@/components/base/primitives';
import { products } from '@/data/products';
import { PEDIDO_MINIMO } from '@/data/config';
import { useCart } from '@/store/cart';
import { calcularResumo } from '@/lib/pricing';
import { formatPrice } from '@/lib/format';
import { Category, categoryLabels } from '@/types/order';

const Store = () => {
  const navigate = useNavigate();
  const { linhas, totalItens, couponCode } = useCart();
  const [activeCategory, setActiveCategory] = useState<Category>('promos');
  const [busca, setBusca] = useState('');

  const buscando = busca.trim().length > 0;

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(termo) ||
        p.description.toLowerCase().includes(termo),
    );
  }, [busca]);

  const daCategoria = useMemo(
    () => products.filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  const destaques = useMemo(() => products.filter((p) => p.featured), []);

  /** Unidades por produto, somando linhas com personalizações diferentes. */
  const quantidadePorProduto = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const l of linhas) {
      mapa[l.product.id] = (mapa[l.product.id] ?? 0) + l.line.quantity;
    }
    return mapa;
  }, [linhas]);

  const contagemPorCategoria = useMemo(() => {
    const mapa: Partial<Record<Category, number>> = {};
    for (const l of linhas) {
      const c = l.product.category;
      mapa[c] = (mapa[c] ?? 0) + l.line.quantity;
    }
    return mapa;
  }, [linhas]);

  const resumo = calcularResumo({
    linhas,
    deliveryType: 'delivery',
    couponCode,
  });

  const lista = buscando ? resultados : daCategoria;

  return (
    <div className="min-h-dvh bg-background pb-bar">
      <StoreHero />

      <div className="px-4 py-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no cardápio"
            aria-label="Buscar no cardápio"
            className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-11 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
          {buscando && (
            <button
              type="button"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="press-sm absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!buscando && (
        <>
          {destaques.length > 0 && (
            <section className="pb-5">
              <SectionTitle className="px-4">Mais pedidos</SectionTitle>
              <FeaturedCarousel products={destaques} />
            </section>
          )}

          <CategoryChips
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            countByCategory={contagemPorCategoria}
          />
        </>
      )}

      <main
        id="painel-produtos"
        role={buscando ? undefined : 'tabpanel'}
        aria-labelledby={buscando ? undefined : `tab-${activeCategory}`}
        className="px-safe py-2"
      >
        <div className="surface overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 text-base font-bold text-foreground">
            {buscando
              ? `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'} para "${busca.trim()}"`
              : categoryLabels[activeCategory]}
          </h2>

          {lista.length > 0 ? (
            lista.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                quantity={quantidadePorProduto[product.id] ?? 0}
              />
            ))
          ) : (
            <p className="px-4 py-10 text-center text-muted-foreground">
              {buscando
                ? 'Nada encontrado. Tente outro termo.'
                : 'Nenhum produto nesta categoria.'}
            </p>
          )}
        </div>
      </main>

      {totalItens > 0 && (
        <BottomBar
          above={
            !resumo.atingiuMinimo ? (
              <div className="bg-success/12 border-t border-success/25 px-4 py-2 text-center text-sm font-semibold text-success">
                Faltam {formatPrice(resumo.faltaParaMinimo)} para o pedido mínimo de{' '}
                {formatPrice(PEDIDO_MINIMO)}
              </div>
            ) : undefined
          }
          left={
            <div className="leading-tight">
              <p className="text-xs text-muted-foreground">
                {totalItens} {totalItens === 1 ? 'item' : 'itens'}
              </p>
              <Money value={resumo.subtotal} className="text-lg font-extrabold" />
            </div>
          }
        >
          <BarButton onClick={() => navigate('/sacola')}>
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            Ver sacola
          </BarButton>
        </BottomBar>
      )}
    </div>
  );
};

export default Store;
