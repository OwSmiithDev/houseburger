import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bike,
  CheckCircle2,
  ChefHat,
  CircleSlash,
  ClipboardCheck,
  MapPin,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCatalog } from '@/data/catalog';
import { registrarConsulta } from '@/lib/historico';
import { montarComanda, whatsappUrl, type DadosComanda } from '@/lib/whatsapp';
import { formatPrice } from '@/lib/format';
import { somStatus } from '@/lib/som';
import { haptic } from '@/lib/haptics';
import { paymentLabels, type PaymentMethod } from '@/types/order';
import { AppBar } from '@/components/base/AppBar';
import { SectionCard } from '@/components/base/primitives';
import { cn } from '@/lib/utils';

const etapas = [
  { id: 'pendente', rotulo: 'Recebido', desc: 'A loja vai confirmar', icone: ClipboardCheck },
  { id: 'preparando', rotulo: 'Preparando', desc: 'Seu pedido está na chapa', icone: ChefHat },
  { id: 'saiu', rotulo: 'Saiu para entrega', desc: 'A caminho do endereço', icone: Bike },
  { id: 'entregue', rotulo: 'Entregue', desc: 'Bom apetite!', icone: CheckCircle2 },
] as const;

/** Na retirada não existe "saiu para entrega". */
const etapasPara = (tipo: 'pickup' | 'delivery') =>
  tipo === 'pickup'
    ? etapas
        .filter((e) => e.id !== 'saiu')
        .map((e) => (e.id === 'entregue' ? { ...e, rotulo: 'Pronto para retirada', desc: 'Pode vir buscar' } : e))
    : etapas;

const TrackOrder = () => {
  const { token = '' } = useParams();
  const statusAnterior = useRef<string | null>(null);
  const catalogo = useCatalog();

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['pedido', token],
    queryFn: async (): Promise<PedidoAcompanhado> => {
      const { data, error } = await api.rpc('consultar_pedido', { p_token: token });
      if (error) throw new Error(error.message);
      return data as PedidoAcompanhado;
    },
    enabled: token.length > 0,
    // 12 segundos: rápido o bastante para parecer imediato numa hamburgueria e
    // leve o bastante para não precisar de WebSocket no pacote do cliente.
    refetchInterval: (q) =>
      ['entregue', 'cancelado'].includes(
        (q.state.data as PedidoAcompanhado | undefined)?.status ?? '',
      )
        ? false
        : 12_000,
    refetchIntervalInBackground: false,
    retry: 2,
  });

  // Avisa só quando o status MUDA. Na primeira carga apenas registra, senão o
  // cliente ouviria um alerta ao abrir a tela sem nada ter acontecido.
  useEffect(() => {
    if (!data) return;
    if (statusAnterior.current !== null && statusAnterior.current !== data.status) {
      somStatus();
      haptic('success');
    }
    statusAnterior.current = data.status;

    // Mantém a lista local em dia. Um pedido entregue continua no histórico —
    // some apenas a faixa de "em andamento" no topo do cardápio.
    registrarConsulta(token, {
      codigo: data.codigo,
      criadoEm: data.criado_em,
      total: Number(data.total),
      tipoEntrega: data.tipo_entrega,
      itens: data.itens.reduce((s, i) => s + i.quantidade, 0),
      finalizado: data.status === 'entregue' || data.status === 'cancelado',
    });
  }, [data, token]);

  if (isPending) {
    return (
      <div className="min-h-dvh bg-background" aria-busy="true">
        <AppBar title="Acompanhar pedido" />
        <div className="animate-pulse space-y-3 p-4">
          <div className="h-28 rounded-2xl bg-muted" />
          <div className="h-56 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-dvh bg-background">
        <AppBar title="Acompanhar pedido" />
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <CircleSlash className="mb-4 h-14 w-14 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground">Pedido não encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            O link pode estar incompleto ou o pedido foi removido.
          </p>
          <Link
            to="/"
            className="press mt-6 flex h-12 items-center rounded-xl bg-primary px-6 font-bold text-primary-foreground"
          >
            Ver cardápio
          </Link>
        </div>
      </div>
    );
  }

  const lista = etapasPara(data.tipo_entrega);
  const atual = lista.findIndex((e) => e.id === data.status);
  const cancelado = data.status === 'cancelado';

  /*
   * Reenvio da comanda pelo WhatsApp.
   *
   * O envio abre a conversa numa aba nova, e navegador nenhum garante isso:
   * bloqueador de pop-up, aba fechada sem querer, WhatsApp que não estava
   * instalado. Sem uma segunda porta, o pedido ficaria registrado no banco sem
   * a cozinha saber. A mensagem é remontada a partir do que o servidor
   * devolveu — não de nada guardado no aparelho.
   */
  const settings = catalogo.data?.settings;
  const podeEnviar = Boolean(settings?.whatsapp) && !cancelado;

  const enviarNoWhatsApp = () => {
    if (!settings) return;
    const comanda: DadosComanda = {
      codigo: data.codigo,
      criadoEm: data.criado_em,
      clienteNome: data.cliente_nome,
      entrega: data.tipo_entrega === 'delivery',
      pagamento: data.pagamento,
      trocoPara: data.troco_para,
      talheres: Boolean(data.talheres),
      endereco: data.endereco,
      complemento: data.complemento,
      local:
        data.lat != null && data.lng != null
          ? { lat: Number(data.lat), lng: Number(data.lng) }
          : null,
      cupom: data.cupom_codigo,
      itens: data.itens,
      subtotal: Number(data.subtotal),
      desconto: Number(data.desconto),
      taxaEntrega: Number(data.taxa_entrega),
      taxaServico: Number(data.taxa_servico),
      total: Number(data.total),
    };
    const url = whatsappUrl(settings.whatsapp, montarComanda(comanda, settings));
    const aba = window.open(url, '_blank');
    if (aba) aba.opener = null;
    else window.location.href = url;
  };

  return (
    <div className="min-h-dvh bg-background pb-8">
      <AppBar title={`Pedido ${data.codigo}`} subtitle={data.cliente_nome} />

      <div className="space-y-3 p-4">
        {cancelado ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-alerta-border bg-alerta p-4 text-alerta-foreground"
          >
            <CircleSlash className="h-6 w-6 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Pedido cancelado</p>
              <p className="text-sm opacity-80">Fale com a loja pelo WhatsApp.</p>
            </div>
          </div>
        ) : (
          <SectionCard>
            <ol className="space-y-1">
              {lista.map((etapa, i) => {
                const Icone = etapa.icone;
                const feito = i <= atual;
                const agora = i === atual;
                return (
                  <li
                    key={etapa.id}
                    className="flex gap-3"
                    aria-current={agora ? 'step' : undefined}
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                          feito
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                          agora && 'ring-4 ring-primary/20',
                        )}
                      >
                        <Icone className="h-4 w-4" aria-hidden="true" />
                      </span>
                      {i < lista.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'my-1 w-0.5 flex-1 rounded-full',
                            i < atual ? 'bg-primary' : 'bg-border',
                          )}
                        />
                      )}
                    </div>
                    <div className={cn('pb-4', !feito && 'opacity-50')}>
                      <p className="text-sm font-bold text-foreground">{etapa.rotulo}</p>
                      <p className="text-xs text-muted-foreground">{etapa.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p
              aria-live="polite"
              className="flex items-center justify-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground"
            >
              <RefreshCw
                className={cn('h-3 w-3', isFetching && 'animate-spin')}
                aria-hidden="true"
              />
              Atualiza sozinho
            </p>
          </SectionCard>
        )}

        <SectionCard>
          <h2 className="mb-3 text-base font-bold text-foreground">Seu pedido</h2>
          <ul className="space-y-2">
            {data.itens.map((item, i) => (
              <li key={i} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-foreground">
                    {item.quantidade}x {item.nome}
                  </span>
                  <span className="tabular-nums text-foreground">
                    {formatPrice(Number(item.total))}
                  </span>
                </div>
                {item.opcoes.map((o, j) => (
                  <p key={j} className="text-xs text-muted-foreground">
                    {o.grupo}: {o.quantidade > 1 ? `${o.quantidade}x ` : ''}
                    {o.opcao}
                  </p>
                ))}
                {item.observacao && (
                  <p className="text-xs italic text-muted-foreground">Obs: {item.observacao}</p>
                )}
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(Number(data.subtotal))}</dd>
            </div>
            {Number(data.desconto) > 0 && (
              <div className="flex justify-between text-success">
                <dt>Desconto</dt>
                <dd className="tabular-nums">−{formatPrice(Number(data.desconto))}</dd>
              </div>
            )}
            {Number(data.taxa_entrega) > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Entrega</dt>
                <dd className="tabular-nums">{formatPrice(Number(data.taxa_entrega))}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1 font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(Number(data.total))}</dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-muted-foreground">
            Pagamento: {paymentLabels[data.pagamento]}
            {data.troco_para && ` · troco para ${formatPrice(Number(data.troco_para))}`}
          </p>
        </SectionCard>

        {data.tipo_entrega === 'delivery' && data.endereco && (
          <SectionCard>
            <h2 className="mb-1 flex items-center gap-1.5 text-base font-bold text-foreground">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Entrega em
            </h2>
            <p className="text-sm text-muted-foreground">{data.endereco}</p>
            {data.complemento && (
              <p className="text-sm text-muted-foreground">{data.complemento}</p>
            )}
          </SectionCard>
        )}

        {podeEnviar && (
          <button
            type="button"
            onClick={enviarNoWhatsApp}
            className="press flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-success text-sm font-bold text-success-foreground"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Enviar comanda no WhatsApp
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/meus-pedidos"
            className="press-sm flex min-h-12 items-center justify-center rounded-xl border-2 border-border text-sm font-bold text-foreground"
          >
            Meus pedidos
          </Link>
          <Link
            to="/"
            className="press-sm flex min-h-12 items-center justify-center rounded-xl border-2 border-border text-sm font-bold text-foreground"
          >
            Cardápio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
