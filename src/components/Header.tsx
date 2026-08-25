import { Clock, Flame, MapPin } from 'lucide-react';

export const Header = () => {
  return (
    /* pt-safe protege o conteúdo do notch/status bar quando o app roda em
       tela cheia (standalone) com viewport-fit=cover. */
    <header className="gradient-hero px-4 pb-6 pt-safe">
      <div className="flex items-center justify-center gap-3 pt-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/20 backdrop-blur-sm">
          <Flame className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
        </div>
        <div className="text-left">
          <h1 className="text-2xl font-black tracking-tight text-primary-foreground">
            HOUSE BURGER
          </h1>
          <p className="text-sm font-medium text-primary-foreground/90">
            Monte seu pedido
          </p>
        </div>
      </div>

      {/* Informação prática de retirada logo no topo, sem custar um toque */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs font-semibold text-primary-foreground/90">
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Aberto agora
        </span>
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-primary-foreground/50" />
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Retirada ou entrega
        </span>
      </div>
    </header>
  );
};
