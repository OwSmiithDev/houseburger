import { Bike, Clock, Star } from 'lucide-react';
import { LOJA, PEDIDO_MINIMO, TAXA_ENTREGA } from '@/data/config';
import { formatPrice } from '@/lib/format';

/**
 * Cabeçalho da loja: banner com o cartão de informações sobreposto, como nas
 * referências. Nota, tempo e taxa ficam visíveis sem custar um toque.
 */
export const StoreHero = () => (
  <header className="relative">
    <div className="relative h-40 overflow-hidden bg-muted">
      <img
        src={LOJA.banner}
        alt=""
        width={800}
        height={400}
        className="h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"
      />
      <div className="absolute inset-x-0 top-0 h-px pt-safe" />
    </div>

    {/* relative + z-10: sem isso o banner (position:relative) pinta por
        cima do cartao e corta o nome da loja. */}
    <div className="relative z-10 -mt-8 px-4">
      <div className="surface p-4">
        <div className="flex items-start gap-3">
          <div className="gradient-hero flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black text-primary-foreground">
            HB
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black leading-tight text-foreground">
              {LOJA.nome}
            </h1>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star
                className="h-4 w-4 fill-secondary text-secondary"
                aria-hidden="true"
              />
              <span className="font-semibold text-foreground">{LOJA.avaliacao}</span>
              <span>({LOJA.avaliacoes})</span>
              <span aria-hidden="true">·</span>
              <span>Lanches</span>
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
          <div>
            <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Entrega
            </dt>
            <dd className="text-sm font-bold text-foreground">
              {LOJA.tempoMin}-{LOJA.tempoMax} min
            </dd>
          </div>
          <div className="border-x border-border">
            <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Bike className="h-3.5 w-3.5" aria-hidden="true" />
              Taxa
            </dt>
            <dd className="text-sm font-bold text-foreground">
              {formatPrice(TAXA_ENTREGA)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Mínimo</dt>
            <dd className="text-sm font-bold text-foreground">
              {formatPrice(PEDIDO_MINIMO)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </header>
);
