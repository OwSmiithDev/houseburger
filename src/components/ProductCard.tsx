import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Product } from '@/types/order';
import { formatPrice } from '@/lib/format';
import { haptic } from '@/lib/haptics';

interface ProductCardProps {
  product: Product;
  /** Quantidade já no carrinho — controla se o card mostra botão ou stepper */
  quantity: number;
  onAdd: (product: Product) => void;
  onRemoveOne: (product: Product) => void;
}

export const ProductCard = ({
  product,
  quantity,
  onAdd,
  onRemoveOne,
}: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const inCart = quantity > 0;

  const handleAdd = () => {
    haptic('success');
    onAdd(product);
  };

  const handleRemoveOne = () => {
    haptic('light');
    onRemoveOne(product);
  };

  return (
    <article
      className={`gradient-card animate-scale-in overflow-hidden rounded-2xl shadow-card transition-shadow duration-200 ${
        inCart ? 'ring-2 ring-secondary' : ''
      }`}
    >
      <div className="relative h-40 overflow-hidden bg-muted">
        {/* Placeholder ocupa o espaço enquanto a imagem carrega: sem ele o card
            salta de altura quando a foto chega (CLS). */}
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
        )}

        <img
          src={product.image}
          alt={product.name}
          width={400}
          height={300}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"
        />

        {product.category === 'promos' && (
          <span className="gradient-hero absolute left-2 top-2 rounded-full px-3 py-1 text-xs font-bold text-primary-foreground">
            OFERTA
          </span>
        )}

        {/* Estado do item no card, não só no carrinho */}
        {inCart && (
          <span className="animate-pop absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-secondary px-2 text-sm font-bold text-secondary-foreground shadow-button">
            {quantity}
            <span className="sr-only"> no carrinho</span>
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="mb-1 text-lg font-bold leading-tight text-foreground">
          {product.name}
        </h3>
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
          {product.description}
        </p>

        <div className="flex items-center justify-between gap-3">
          <span className="text-gradient text-2xl font-extrabold">
            {formatPrice(product.price)}
          </span>

          {inCart ? (
            <div
              className="flex items-center gap-1 rounded-full bg-muted p-1"
              role="group"
              aria-label={`Quantidade de ${product.name}`}
            >
              <button
                type="button"
                onClick={handleRemoveOne}
                aria-label={`Remover um ${product.name}`}
                className="press-sm flex h-10 w-10 items-center justify-center rounded-full text-foreground"
              >
                <Minus className="h-5 w-5" aria-hidden="true" />
              </button>

              <span
                key={quantity}
                aria-live="polite"
                className="animate-pop min-w-6 text-center text-base font-bold tabular-nums text-foreground"
              >
                {quantity}
              </span>

              <button
                type="button"
                onClick={handleAdd}
                aria-label={`Adicionar mais um ${product.name}`}
                className="gradient-hero press-sm flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={`Adicionar ${product.name} ao carrinho`}
              className="gradient-hero press tap-target flex items-center gap-2 rounded-full px-4 text-sm font-bold text-primary-foreground shadow-button"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span>Adicionar</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
