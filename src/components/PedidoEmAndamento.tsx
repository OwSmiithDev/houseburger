import { Link } from 'react-router-dom';
import { ChevronRight, Clock } from 'lucide-react';
import { pedidoEmAndamento } from '@/lib/historico';

/**
 * Atalho para o pedido em andamento.
 *
 * O cliente fecha o app enquanto espera a comida — sem esta faixa, voltar ao
 * acompanhamento exigiria guardar o link. Sai do histórico local e some sozinho
 * quando o pedido é entregue, cancelado ou envelhece.
 */
export const PedidoEmAndamento = () => {
  const pedido = pedidoEmAndamento();
  if (!pedido) return null;

  return (
    <Link
      to={`/pedido/${pedido.token}`}
      className="press flex items-center gap-3 border-b border-info-border bg-info px-4 py-3 text-info-foreground"
    >
      <Clock className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">
          Pedido {pedido.codigo} em andamento
        </span>
        <span className="block text-xs opacity-80">Toque para acompanhar</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
    </Link>
  );
};
