import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@/types/order';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const CapaProduto = ({ product }: { product: Product }) => {
  const [carregou, setCarregou] = useState(false);
  return (
    <div className="relative h-28 w-full overflow-hidden rounded-xl bg-muted">
      {!carregou && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
      )}
      <img
        src={product.image}
        alt={product.name}
        width={300}
        height={220}
        loading="lazy"
        decoding="async"
        onLoad={() => setCarregou(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          carregou ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
};

/**
 * Vitrine horizontal dos destaques, com a numeração das referências.
 *
 * O número é decoração de ranking, não conteúdo: fica fora do nome acessível
 * para o leitor de tela anunciar só o produto e o preço.
 */
export const FeaturedCarousel = ({ products }: { products: Product[] }) => {
  if (products.length === 0) return null;

  return (
    <ul className="no-scrollbar snap-x-mandatory flex gap-3 overflow-x-auto px-4 pb-1">
      {products.map((product, index) => (
        <li key={product.id} className="snap-start-always w-36 shrink-0">
          <Link to={`/produto/${product.id}`} className="press block">
            <div className="relative">
              <CapaProduto product={product} />
              <span
                aria-hidden="true"
                className="absolute left-1 top-0 text-3xl font-black italic leading-none text-primary-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,.6)]"
              >
                {index + 1}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
              {product.name}
            </p>
            <p className="mt-0.5 text-sm font-extrabold text-foreground">
              {formatPrice(product.price)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
};
