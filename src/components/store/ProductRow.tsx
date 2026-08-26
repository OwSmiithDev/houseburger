import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '@/types/order';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ProductRowProps {
  product: Product;
  /** Quantas unidades deste produto já estão no carrinho, somando as linhas. */
  quantity?: number;
}

/**
 * Linha do cardápio: texto à esquerda, foto à direita.
 *
 * A linha inteira é o link para a página do produto — em vez de um botão de
 * adicionar que atropelaria os grupos obrigatórios de personalização.
 */
export const ProductRow = ({ product, quantity = 0 }: ProductRowProps) => {
  const [carregou, setCarregou] = useState(false);
  const temOpcoes = (product.groups?.length ?? 0) > 0;

  return (
    <Link
      to={`/produto/${product.id}`}
      className="press flex items-start gap-3 border-b border-border px-4 py-4 last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold leading-snug text-foreground">
          {product.name}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          {product.description}
        </p>
        <p className="mt-2 text-sm">
          {temOpcoes && (
            <span className="text-xs text-muted-foreground">a partir de </span>
          )}
          <span className="text-base font-extrabold text-foreground">
            {formatPrice(product.price)}
          </span>
        </p>
      </div>

      <div className="relative h-24 w-24 shrink-0">
        {!carregou && (
          <div className="absolute inset-0 animate-pulse rounded-xl bg-muted" aria-hidden="true" />
        )}
        <img
          src={product.image}
          alt={product.name}
          width={200}
          height={200}
          loading="lazy"
          decoding="async"
          onLoad={() => setCarregou(true)}
          className={cn(
            'h-24 w-24 rounded-xl object-cover transition-opacity duration-300',
            carregou ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* Afordância de ação; a navegação é do link que envolve a linha. */}
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-button"
        >
          {quantity > 0 ? (
            <span className="text-xs font-bold">{quantity}</span>
          ) : (
            <Plus className="h-4 w-4" strokeWidth={3} />
          )}
        </span>
        {quantity > 0 && (
          <span className="sr-only">{quantity} no carrinho</span>
        )}
      </div>
    </Link>
  );
};
