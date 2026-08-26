import type { ReactNode } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useCatalog } from '@/data/catalog';
import { CartProvider } from '@/store/cart';

/**
 * Nada de cliente renderiza antes do catálogo chegar.
 *
 * A escolha foi bloquear em vez de mostrar cache: um preço desatualizado vira
 * conflito no balcão, e é pior do que perder um pedido numa oscilação de rede.
 * Por isso não há caminho "seguir mesmo assim" — sem catálogo não há cardápio
 * nem sacola.
 */
export const CatalogGate = ({ children }: { children: ReactNode }) => {
  const { data: catalog, isPending, isError, error, refetch, isFetching } =
    useCatalog();

  if (isPending) {
    return (
      <div
        className="min-h-dvh animate-pulse bg-background"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="h-40 bg-muted" />
        <div className="space-y-3 p-4">
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-12 rounded-xl bg-muted" />
          <div className="h-40 rounded-2xl bg-muted" />
        </div>
        <span className="sr-only">Carregando o cardápio</span>
      </div>
    );
  }

  if (isError || !catalog) {
    return (
      <div
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center px-8 text-center"
      >
        <CloudOff className="mb-4 h-16 w-16 text-muted-foreground/40" aria-hidden="true" />
        <h1 className="text-lg font-bold text-foreground">
          Não foi possível carregar o cardápio
        </h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Sem conexão com nosso servidor não conseguimos mostrar os preços
          atuais. Tente de novo em instantes.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="press mt-6 flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-button disabled:opacity-70"
        >
          <RefreshCw
            className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {isFetching ? 'Tentando...' : 'Tentar de novo'}
        </button>

        {import.meta.env.DEV && error && (
          <p className="mt-6 max-w-xs break-words text-xs text-muted-foreground">
            {error.message}
          </p>
        )}
      </div>
    );
  }

  return <CartProvider catalog={catalog}>{children}</CartProvider>;
};
