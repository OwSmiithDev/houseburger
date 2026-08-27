import { Clock } from 'lucide-react';

/**
 * Aviso de loja fechada.
 *
 * A função `create_order` já recusa pedidos com a loja fechada, mas descobrir
 * isso só no último botão seria cruel: o cliente teria montado o pedido
 * inteiro à toa. O cardápio continua visível — serve de vitrine —, só não dá
 * para pedir.
 */
export const LojaFechada = () => (
  <div
    role="status"
    className="flex items-start gap-3 border-b border-aviso-border bg-aviso px-4 py-3 text-aviso-foreground"
  >
    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-aviso-foreground" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-sm font-bold">Estamos fechados agora</p>
      <p className="text-xs opacity-80">
        Você pode ver o cardápio, mas não é possível fazer pedidos no momento.
      </p>
    </div>
  </div>
);
