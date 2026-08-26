import { Bike, Clock, MapPin, Star } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { mapsUrl } from '@/lib/whatsapp';
import type { StoreSettings } from '@/types/order';

/** Iniciais para quando a loja ainda não tem logo cadastrada. */
const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'HB';

/**
 * Cabeçalho da loja: banner com o cartão de informações sobreposto.
 * Nota, tempo e taxa ficam visíveis sem custar um toque.
 */
export const StoreHero = ({ settings }: { settings: StoreSettings }) => {
  const porKm = settings.deliveryMode === 'km';

  return (
    <header className="relative">
      <div className="relative h-40 overflow-hidden bg-muted">
        {settings.banner && (
          <img
            src={settings.banner}
            alt=""
            width={800}
            height={400}
            className="h-full w-full object-cover"
          />
        )}
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
            {/* A logo vem do admin. Sem ela, cai nas iniciais do nome — antes
                havia um "HB" fixo aqui, que ignorava o que fosse cadastrado. */}
            {settings.logo ? (
              <img
                src={settings.logo}
                alt={`Logo ${settings.name}`}
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-xl bg-muted object-cover"
              />
            ) : (
              <div className="gradient-hero flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black text-primary-foreground">
                {iniciais(settings.name)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-black leading-tight text-foreground">
                {settings.name}
              </h1>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star
                  className="h-4 w-4 fill-secondary text-secondary"
                  aria-hidden="true"
                />
                <span className="font-semibold text-foreground">{settings.rating}</span>
                {settings.ratingsLabel && <span>({settings.ratingsLabel})</span>}
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
                {settings.timeMin}-{settings.timeMax} min
              </dd>
            </div>
            <div className="border-x border-border">
              <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Bike className="h-3.5 w-3.5" aria-hidden="true" />
                Taxa
              </dt>
              <dd className="text-sm font-bold text-foreground">
                {porKm ? (
                  <>
                    {formatPrice(settings.deliveryPerKm)}
                    <span className="text-xs font-normal text-muted-foreground">
                      /km
                    </span>
                  </>
                ) : (
                  formatPrice(settings.deliveryFee)
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mínimo</dt>
              <dd className="text-sm font-bold text-foreground">
                {formatPrice(settings.minOrder)}
              </dd>
            </div>
          </dl>

          {/* Endereço para quem vai retirar. Só aparece se cadastrado. */}
          {settings.address && (
            <div className="mt-3 flex items-start gap-2 border-t border-border pt-3">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                {settings.address}
                {settings.lat !== null && settings.lng !== null && (
                  <>
                    {' · '}
                    <a
                      href={mapsUrl({ lat: settings.lat, lng: settings.lng })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary underline"
                    >
                      ver no mapa
                    </a>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
