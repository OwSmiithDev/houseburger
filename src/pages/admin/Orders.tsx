import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { Pill } from '@/components/base/primitives';
import { listarPedidos, mudarStatus, type StatusPedido } from '@/lib/admin-api';
import { formatPrice } from '@/lib/format';
import { paymentLabels, type PaymentMethod } from '@/types/order';
import { mapsUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

const fluxo: StatusPedido[] = ['pendente', 'preparando', 'saiu', 'entregue'];

const rotuloStatus: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  preparando: 'Preparando',
  saiu: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const corStatus: Record<StatusPedido, string> = {
  pendente: 'bg-secondary/20 text-secondary-foreground',
  preparando: 'bg-primary/15 text-primary',
  saiu: 'bg-primary/15 text-primary',
  entregue: 'bg-success/15 text-success',
  cancelado: 'bg-muted text-muted-foreground',
};

const hora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const Orders = () => {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<StatusPedido | 'todos'>('todos');

  const pedidos = useQuery({
    queryKey: ['admin', 'pedidos'],
    queryFn: () => listarPedidos(100),
    // A cozinha deixa esta tela aberta; sem isto um pedido novo só apareceria
    // ao recarregar a página na mão.
    refetchInterval: 30_000,
  });

  const atualizar = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusPedido }) =>
      mudarStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pedidos'] }),
    onError: (e: Error) => toast.error('Não foi possível atualizar', { description: e.message }),
  });

  const lista = (pedidos.data ?? []).filter(
    (p) => filtro === 'todos' || p.status === filtro,
  );

  return (
    <AdminShell>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {(['todos', ...fluxo, 'cancelado'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFiltro(s)}
            className={cn(
              'press-sm h-11 shrink-0 rounded-full px-4 text-sm font-semibold',
              filtro === s ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-card',
            )}
          >
            {s === 'todos' ? 'Todos' : rotuloStatus[s]}
          </button>
        ))}
      </div>

      {pedidos.isPending && <p className="py-10 text-center text-muted-foreground">Carregando...</p>}

      {!pedidos.isPending && lista.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">Nenhum pedido aqui.</p>
      )}

      <div className="space-y-3">
        {lista.map((p) => {
          const expandido = aberto === p.id;
          const status = p.status as StatusPedido;
          const proximo = fluxo[fluxo.indexOf(status) + 1];

          return (
            <article key={p.id} className="surface overflow-hidden">
              <button
                type="button"
                onClick={() => setAberto(expandido ? null : p.id)}
                aria-expanded={expandido}
                className="press-sm flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-black text-foreground">{p.codigo}</span>
                    <Pill className={corStatus[status]}>{rotuloStatus[status]}</Pill>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-foreground">
                    {p.cliente_nome}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {hora(p.criado_em)} · {p.tipo_entrega === 'delivery' ? 'Entrega' : 'Retirada'} ·{' '}
                    {paymentLabels[p.pagamento as PaymentMethod]}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-extrabold tabular-nums text-foreground">
                    {formatPrice(Number(p.total))}
                  </span>
                  <ChevronDown
                    className={cn(
                      'ml-auto h-5 w-5 text-muted-foreground transition-transform',
                      expandido && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </span>
              </button>

              {expandido && (
                <div className="animate-slide-down border-t border-border p-4">
                  <ul className="space-y-2">
                    {(p.order_items ?? []).map((item) => (
                      <li key={item.id} className="text-sm">
                        <span className="font-semibold text-foreground">
                          {item.quantidade}x {item.nome}
                        </span>
                        <span className="float-right tabular-nums text-foreground">
                          {formatPrice(Number(item.total))}
                        </span>
                        {(item.opcoes ?? []).map((o, i) => (
                          <span key={i} className="block text-xs text-muted-foreground">
                            {o.grupo}: {o.quantidade > 1 ? `${o.quantidade}x ` : ''}
                            {o.opcao}
                          </span>
                        ))}
                        {item.observacao && (
                          <span className="block text-xs italic text-muted-foreground">
                            Obs: {item.observacao}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Subtotal</dt>
                      <dd className="tabular-nums">{formatPrice(Number(p.subtotal))}</dd>
                    </div>
                    {Number(p.desconto) > 0 && (
                      <div className="flex justify-between text-success">
                        <dt>Desconto {p.cupom_codigo ? `(${p.cupom_codigo})` : ''}</dt>
                        <dd className="tabular-nums">−{formatPrice(Number(p.desconto))}</dd>
                      </div>
                    )}
                    {Number(p.taxa_entrega) > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Entrega</dt>
                        <dd className="tabular-nums">{formatPrice(Number(p.taxa_entrega))}</dd>
                      </div>
                    )}
                    {p.troco_para && (
                      <div className="flex justify-between font-semibold">
                        <dt>Troco para</dt>
                        <dd className="tabular-nums">
                          {formatPrice(Number(p.troco_para))} (levar{' '}
                          {formatPrice(Number(p.troco_para) - Number(p.total))})
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border pt-1 font-bold">
                      <dt>Total</dt>
                      <dd className="tabular-nums">{formatPrice(Number(p.total))}</dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Talheres: {p.talheres ? 'sim' : 'não'}
                  </p>

                  {p.endereco && (
                    <div className="mt-3 rounded-xl bg-muted p-3 text-sm">
                      <p className="text-foreground">{p.endereco}</p>
                      {p.complemento && (
                        <p className="text-muted-foreground">{p.complemento}</p>
                      )}
                      {p.lat && p.lng && (
                        <a
                          href={mapsUrl({ lat: Number(p.lat), lng: Number(p.lng) })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="press-sm mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
                        >
                          <MapPin className="h-4 w-4" aria-hidden="true" />
                          Abrir no mapa
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {proximo && status !== 'cancelado' && (
                      <button
                        type="button"
                        disabled={atualizar.isPending}
                        onClick={() => atualizar.mutate({ id: p.id, status: proximo })}
                        className="press h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
                      >
                        Marcar como {rotuloStatus[proximo].toLowerCase()}
                      </button>
                    )}
                    {status !== 'cancelado' && status !== 'entregue' && (
                      <button
                        type="button"
                        disabled={atualizar.isPending}
                        onClick={() => atualizar.mutate({ id: p.id, status: 'cancelado' })}
                        className="press-sm h-11 rounded-xl border-2 border-border px-4 text-sm font-bold text-destructive disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
};

export default Orders;
