import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, MapPin, Printer, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { Pill } from '@/components/base/primitives';
import { buscarPedidos, listarPedidos, mudarStatus, type StatusPedido } from '@/lib/admin-api';
import { intervaloVarredura, useAlerta } from '@/hooks/use-alerta-pedidos';
import { formatPrice } from '@/lib/format';
import { paymentLabels, type PaymentMethod } from '@/types/order';
import { mapsUrl } from '@/lib/whatsapp';
import { imprimirComanda, type PedidoImpressao } from '@/lib/imprimir';
import { lerConfiguracao } from '@/lib/admin-api';
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
  pendente: 'bg-aviso text-aviso-foreground',
  preparando: 'bg-info text-info-foreground',
  saiu: 'bg-rota text-rota-foreground',
  entregue: 'bg-economia text-economia-foreground',
  cancelado: 'bg-muted text-muted-foreground',
};

/*
 * Cor do cartão inteiro, para achar o pedido certo de relance numa lista.
 *
 * Uma faixa saturada na lateral mais um fundo suave da mesma cor: a faixa se
 * enxerga de longe, o fundo não briga com o texto.
 *
 * Cancelado fica cinza, e não vermelho, de propósito. No painel o vermelho já
 * significa "pedido pendente esperando"; usar a mesma cor para algo que não
 * pede nada ensina a pessoa a ignorá-la.
 */
const corCartao: Record<StatusPedido, string> = {
  pendente: 'border-l-4 border-l-aviso-border bg-aviso/40',
  preparando: 'border-l-4 border-l-info-border bg-info/40',
  saiu: 'border-l-4 border-l-rota-border bg-rota/40',
  entregue: 'border-l-4 border-l-economia-border bg-economia/30',
  cancelado: 'border-l-4 border-l-border bg-muted/50 opacity-70',
};

/**
 * Início do dia escolhido, no fuso de quem está olhando a tela.
 *
 * O `<input type="date">` devolve `AAAA-MM-DD` sem fuso. Interpretar isso como
 * UTC jogaria o corte três horas para trás no Brasil, e pedidos da madrugada
 * cairiam no dia anterior.
 */
const inicioDoDia = (data: string) => new Date(`${data}T00:00:00`).toISOString();

/**
 * Fim do dia escolhido, como instante exclusivo: a meia-noite do dia seguinte.
 *
 * `buscar_pedidos` compara com `<`, então passar a meia-noite do próprio dia
 * final deixaria de fora tudo que foi pedido depois dela — e um filtro de
 * "hoje até hoje" viraria uma janela vazia, sem nenhum pedido.
 *
 * `setDate` em vez de somar 24h em milissegundos: assim vira mês e ano
 * sozinho, e não se perde numa eventual mudança de horário de verão.
 */
const fimDoDia = (data: string) => {
  const d = new Date(`${data}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
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
  const [texto, setTexto] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  // Só vira busca no banco quando há algo para procurar; sem isso a tela
  // continua na listagem normal, que o tempo real mantém atualizada.
  const buscando = Boolean(texto.trim() || de || ate);

  const config = useQuery({ queryKey: ['admin', 'config'], queryFn: lerConfiguracao });

  const imprimir = (p: PedidoImpressao) => {
    try {
      imprimirComanda(p, {
        nome: config.data?.nome ?? 'Pedido',
        whatsapp: config.data?.whatsapp,
        endereco: config.data?.endereco,
      });
    } catch (e) {
      toast.error('Não foi possível abrir a impressão', {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const { tempoRealAtivo } = useAlerta();

  const pedidos = useQuery({
    queryKey: ['admin', 'pedidos'],
    queryFn: () => listarPedidos(100),
    /*
     * A cozinha deixa esta tela aberta o serviço inteiro, então ela precisa se
     * atualizar sozinha. O caminho rápido é a assinatura em tempo real, que
     * invalida esta consulta assim que um pedido entra; a varredura abaixo é a
     * rede de segurança, e por isso acelera para 10s quando o tempo real não
     * está de pé. Com 30s fixos um pedido pago ficava meio minuto invisível.
     */
    refetchInterval: intervaloVarredura(tempoRealAtivo),
    // Declarado, e não herdado do padrão do React Query: voltar para a aba
    // precisa mostrar o que chegou enquanto ela estava em segundo plano.
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  /*
   * Busca no banco. Só roda quando há filtro, e sem varredura periódica: o
   * resultado é uma consulta pontual, não a fila que a cozinha acompanha.
   *
   * O intervalo é pela data de criação do pedido, e as duas pontas são
   * inclusivas para quem escolhe: "de 28 até 28" traz o dia 28 inteiro.
   */
  const busca = useQuery({
    queryKey: ['admin', 'pedidos', 'busca', texto.trim(), de, ate, filtro],
    queryFn: () =>
      buscarPedidos({
        texto: texto.trim(),
        inicio: de ? inicioDoDia(de) : null,
        fim: ate ? fimDoDia(ate) : null,
        status: filtro === 'todos' ? null : filtro,
        limite: 200,
      }),
    enabled: buscando,
    staleTime: 30_000,
  });

  const atualizar = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusPedido }) =>
      mudarStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pedidos'] });
      // A contagem em vermelho também: aceitar um pedido tira ele da fila, e o
      // badge não pode ficar mentindo até a próxima varredura de 15s.
      qc.invalidateQueries({ queryKey: ['admin', 'pendentes'] });
    },
    onError: (e: Error) => toast.error('Não foi possível atualizar', { description: e.message }),
  });

  // Buscando, quem filtra por status é o banco; senão, o filtro é local sobre
  // a lista que já está carregada.
  const lista = buscando
    ? busca.data ?? []
    : (pedidos.data ?? []).filter((p) => filtro === 'todos' || p.status === filtro);

  const carregando = buscando ? busca.isPending : pedidos.isPending;

  return (
    <AdminShell>
      <div className="surface mb-3 space-y-2 p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Código do pedido ou nome do cliente"
            aria-label="Buscar pedidos"
            className="h-11 w-full rounded-lg border-2 border-border bg-card pl-9 pr-9 text-sm text-foreground"
          />
          {texto && (
            <button
              type="button"
              onClick={() => setTexto('')}
              aria-label="Limpar busca"
              className="press-sm absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">
            <span className="mb-1 block font-bold text-foreground">De</span>
            <input
              type="date"
              value={de}
              max={ate || undefined}
              onChange={(e) => setDe(e.target.value)}
              className="h-11 rounded-lg border-2 border-border bg-card px-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-bold text-foreground">Até</span>
            <input
              type="date"
              value={ate}
              min={de || undefined}
              onChange={(e) => setAte(e.target.value)}
              className="h-11 rounded-lg border-2 border-border bg-card px-2 text-sm text-foreground"
            />
          </label>
          {buscando && (
            <button
              type="button"
              onClick={() => {
                setTexto('');
                setDe('');
                setAte('');
              }}
              className="press-sm h-11 rounded-lg border-2 border-border px-3 text-sm font-bold text-muted-foreground"
            >
              Limpar
            </button>
          )}
        </div>

        {buscando && (
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {busca.isPending
              ? 'Procurando em todo o histórico...'
              : `${lista.length} ${lista.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'} em todo o histórico`}
          </p>
        )}
      </div>

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

      {carregando && <p className="py-10 text-center text-muted-foreground">Carregando...</p>}

      {!carregando && lista.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">
          {buscando ? 'Nenhum pedido com esses filtros.' : 'Nenhum pedido aqui.'}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 md:items-start">
        {lista.map((p) => {
          const expandido = aberto === p.id;
          const status = p.status as StatusPedido;
          const proximo = fluxo[fluxo.indexOf(status) + 1];

          return (
            <article key={p.id} className={cn('surface overflow-hidden', corCartao[status])}>
              {/* Duas ações lado a lado: expandir e imprimir. Botões irmãos, não
                  aninhados — botão dentro de botão é HTML inválido e o clique da
                  impressora acabava caindo no acordeão. */}
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setAberto(expandido ? null : p.id)}
                  aria-expanded={expandido}
                  className="press-sm flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
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

                <button
                  type="button"
                  onClick={() => imprimir(p as unknown as PedidoImpressao)}
                  aria-label={`Imprimir comanda do pedido ${p.codigo}`}
                  title="Imprimir comanda"
                  className="press-sm tap-target flex shrink-0 items-center justify-center border-l border-border px-4 text-muted-foreground"
                >
                  <Printer className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

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
