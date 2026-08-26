import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Banknote,
  ChevronRight,
  Clock,
  CreditCard,
  MapPin,
  QrCode,
  Send,
  Store,
  Truck,
  Navigation,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppBar } from '@/components/base/AppBar';
import { BarButton, BottomBar } from '@/components/base/BottomBar';
import { Money, Pill, SectionCard } from '@/components/base/primitives';
import { useCart } from '@/store/cart';
import { useCheckout } from '@/store/checkout';
import { calcularResumo } from '@/lib/pricing';
import { mapsUrl, montarComanda, whatsappUrl } from '@/lib/whatsapp';
import { criarPedido } from '@/lib/orders';
import { formatPrice } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { paymentLabels, type DeliveryType } from '@/types/order';

const iconesPagamento = {
  pix: QrCode,
  credit: CreditCard,
  debit: CreditCard,
  cash: Banknote,
} as const;

const Checkout = () => {
  const navigate = useNavigate();
  const { catalog, linhas, lines, couponCode, cutlery, clearCart } = useCart();
  const { customer, setCustomer, gorjeta, setGorjeta } = useCheckout();
  const [erros, setErros] = useState<{ name?: string; address?: string }>({});
  const [gorjetaOutra, setGorjetaOutra] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { settings } = catalog;

  const entrega = customer.deliveryType === 'delivery';
  const resumo = calcularResumo({
    catalog,
    linhas,
    deliveryType: customer.deliveryType,
    couponCode,
    gorjeta,
    destino: customer.location,
  });

  // No modo por quilômetro sem ponto no mapa não há como calcular a taxa, e o
  // banco recusa o pedido. Melhor barrar aqui, antes de o cliente tentar.
  const faltaLocalizacao = entrega && resumo.entrega.precisaLocalizacao;
  const foraDeArea = entrega && resumo.entrega.foraDeArea;
  const podeEnviar = settings.open && !faltaLocalizacao && !foraDeArea;

  // Sacola esvaziada em outra aba, ou entrada direta pela URL.
  useEffect(() => {
    if (lines.length === 0) navigate('/', { replace: true });
  }, [lines.length, navigate]);

  const limparErro = (campo: 'name' | 'address') =>
    setErros((anterior) => {
      if (!anterior[campo]) return anterior;
      const proximo = { ...anterior };
      delete proximo[campo];
      return proximo;
    });

  const enviar = async () => {
    const achados: typeof erros = {};
    if (!customer.name.trim()) achados.name = 'Informe seu nome para identificarmos o pedido.';
    if (entrega && !customer.address?.trim()) achados.address = 'Informe o endereço da entrega.';

    if (Object.keys(achados).length > 0) {
      setErros(achados);
      haptic('warning');
      document.getElementById(Object.keys(achados)[0])?.focus();
      return;
    }

    // A janela precisa ser aberta ANTES do await: navegadores só permitem
    // window.open dentro do gesto do usuário, e abrir depois da resposta do
    // servidor cairia no bloqueador de pop-up.
    const aba = window.open('', '_blank', 'noopener,noreferrer');

    setEnviando(true);
    try {
      // O banco recalcula tudo e devolve os valores verdadeiros. A comanda sai
      // desse retorno, não do resumo que a tela calculou.
      const pedido = await criarPedido({
        linhas,
        customer,
        cutlery,
        couponCode,
        gorjeta,
      });

      const mensagem = montarComanda({ pedido, customer, cutlery, settings });
      const url = whatsappUrl(settings.whatsapp, mensagem);

      if (aba) aba.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');

      haptic('success');
      toast.success(`Pedido ${pedido.codigo} registrado!`, {
        description: 'Confirme a conversa no WhatsApp.',
      });
      clearCart();
      navigate('/', { replace: true });
    } catch (erro) {
      aba?.close();
      haptic('warning');
      toast.error('Não foi possível enviar o pedido', {
        description: erro instanceof Error ? erro.message : 'Tente de novo.',
      });
    } finally {
      setEnviando(false);
    }
  };

  const classeCampo = (temErro: boolean) =>
    cn(
      'h-12 w-full rounded-xl border-2 bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors',
      temErro ? 'border-destructive' : 'border-border focus:border-ring',
    );

  return (
    <div className="min-h-dvh bg-background pb-bar">
      <AppBar title="Finalizar pedido" fallback="/sacola" />

      <div className="space-y-3 px-4 py-4">
        {/* Retirada ou entrega */}
        <SectionCard>
          <h2 className="mb-3 text-base font-bold text-foreground">Como você quer receber?</h2>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de entrega">
            {([
              { value: 'delivery', label: 'Entrega', desc: 'No seu endereço', icon: Truck },
              { value: 'pickup', label: 'Retirada', desc: 'No balcão', icon: Store },
            ] as Array<{ value: DeliveryType; label: string; desc: string; icon: typeof Truck }>).map(
              ({ value, label, desc, icon: Icon }) => {
                const ativo = customer.deliveryType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => {
                      haptic('light');
                      setCustomer({ deliveryType: value });
                    }}
                    className={cn(
                      'press flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-colors',
                      ativo ? 'border-primary bg-primary/8' : 'border-border',
                    )}
                  >
                    <Icon
                      className={cn('h-5 w-5', ativo ? 'text-primary' : 'text-muted-foreground')}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-bold text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </button>
                );
              },
            )}
          </div>
        </SectionCard>

        {/* Dados do cliente */}
        <SectionCard>
          <label htmlFor="name" className="mb-2 block text-sm font-bold text-foreground">
            Seu nome <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            maxLength={80}
            enterKeyHint="next"
            placeholder="Como devemos te chamar?"
            value={customer.name}
            aria-invalid={Boolean(erros.name)}
            aria-describedby={erros.name ? 'name-error' : undefined}
            onChange={(e) => {
              setCustomer({ name: e.target.value });
              limparErro('name');
            }}
            className={classeCampo(Boolean(erros.name))}
          />
          {erros.name && (
            <p id="name-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {erros.name}
            </p>
          )}

          {entrega && (
            <>
              <label htmlFor="address" className="mb-2 mt-4 block text-sm font-bold text-foreground">
                Endereço <span className="text-destructive">*</span>
              </label>
              <input
                id="address"
                type="text"
                autoComplete="street-address"
                maxLength={200}
                enterKeyHint="next"
                placeholder="Rua, número, bairro"
                value={customer.address}
                aria-invalid={Boolean(erros.address)}
                aria-describedby={erros.address ? 'address-error' : undefined}
                onChange={(e) => {
                  setCustomer({ address: e.target.value });
                  limparErro('address');
                }}
                className={classeCampo(Boolean(erros.address))}
              />
              {erros.address && (
                <p id="address-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {erros.address}
                </p>
              )}

              <label htmlFor="complement" className="mb-2 mt-4 block text-sm font-bold text-foreground">
                Complemento
              </label>
              <input
                id="complement"
                type="text"
                maxLength={120}
                enterKeyHint="done"
                placeholder="Apartamento, bloco, referência"
                value={customer.complement}
                onChange={(e) => setCustomer({ complement: e.target.value })}
                className={classeCampo(false)}
              />

              <button
                type="button"
                onClick={() => navigate('/endereco')}
                className="press mt-4 flex w-full items-center gap-3 rounded-xl border-2 border-border p-3 text-left"
              >
                <MapPin
                  className={cn('h-5 w-5 shrink-0', customer.location ? 'text-success' : 'text-muted-foreground')}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">
                    {customer.location ? 'Local confirmado no mapa' : 'Marcar no mapa'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {customer.location
                      ? 'Ajuda o entregador a chegar mais rápido'
                      : 'Opcional, mas acelera a entrega'}
                  </span>
                </span>
                {customer.location && <Pill tone="done">OK</Pill>}
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </>
          )}
        </SectionCard>

        {/* Onde retirar */}
        {!entrega && settings.address && (
          <SectionCard>
            <h2 className="mb-1 text-base font-bold text-foreground">Retirar em</h2>
            <p className="text-sm text-muted-foreground">{settings.address}</p>
            {settings.lat !== null && settings.lng !== null && (
              <a
                href={mapsUrl({ lat: settings.lat, lng: settings.lng })}
                target="_blank"
                rel="noopener noreferrer"
                className="press-sm mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Abrir no mapa
              </a>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Pronto em {settings.timeMin}-{settings.timeMax} minutos após a
              confirmação.
            </p>
          </SectionCard>
        )}

        {/* Pagamento */}
        <button
          type="button"
          onClick={() => navigate('/pagamento')}
          className="press surface flex w-full items-center gap-3 p-4 text-left"
        >
          {(() => {
            const Icone = iconesPagamento[customer.paymentMethod];
            return <Icone className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />;
          })()}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">Forma de pagamento</span>
            <span className="block text-xs text-muted-foreground">
              {paymentLabels[customer.paymentMethod]}
              {customer.paymentMethod === 'cash' && customer.changeFor
                ? ` · troco para ${formatPrice(customer.changeFor)}`
                : ''}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>

        {/* Gorjeta */}
        {entrega && (
          <SectionCard>
            <h2 className="text-base font-bold text-foreground">Gorjeta ao entregador</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Opcional. O valor é entregue em mãos junto com o pagamento.
            </p>
            <div className="flex flex-wrap gap-2">
              {settings.tips.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => {
                    haptic('light');
                    setGorjeta(gorjeta === valor ? 0 : valor);
                    setGorjetaOutra('');
                  }}
                  className={cn(
                    'press h-11 min-w-20 rounded-xl border-2 px-4 text-sm font-bold transition-colors',
                    gorjeta === valor
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground',
                  )}
                >
                  {formatPrice(valor)}
                </button>
              ))}
              <input
                type="text"
                inputMode="decimal"
                value={gorjetaOutra}
                onChange={(e) => {
                  const texto = e.target.value.replace(/[^0-9,.]/g, '');
                  setGorjetaOutra(texto);
                  const numero = Number(texto.replace(',', '.'));
                  setGorjeta(Number.isFinite(numero) && numero > 0 ? numero : 0);
                }}
                placeholder="Outro"
                aria-label="Outro valor de gorjeta"
                className="h-11 w-24 rounded-xl border-2 border-border bg-card px-3 text-center text-sm font-bold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:border-ring focus:outline-none"
              />
            </div>
          </SectionCard>
        )}

        {/* Resumo com as contas abertas */}
        <SectionCard>
          <h2 className="mb-3 text-base font-bold text-foreground">Resumo</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd><Money value={resumo.subtotal} className="text-foreground" /></dd>
            </div>

            {resumo.cupom && resumo.desconto > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-success">Desconto ({resumo.cupom.code})</dt>
                <dd className="text-success">
                  −<Money value={resumo.desconto} />
                </dd>
              </div>
            )}

            {entrega && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  Taxa de entrega
                  {resumo.entrega.distancia !== null && (
                    <span className="ml-1 text-xs">
                      ({resumo.entrega.distancia} km)
                    </span>
                  )}
                </dt>
                <dd>
                  {resumo.entregaGratis ? (
                    <span className="flex items-center gap-2">
                      <Money value={resumo.taxaEntregaCheia} className="text-muted-foreground line-through" />
                      <span className="font-bold text-success">Grátis</span>
                    </span>
                  ) : (
                    <Money value={resumo.taxaEntrega} className="text-foreground" />
                  )}
                </dd>
              </div>
            )}

            {resumo.taxaServico > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Taxa de serviço</dt>
                <dd><Money value={resumo.taxaServico} className="text-foreground" /></dd>
              </div>
            )}

            {resumo.gorjeta > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Gorjeta</dt>
                <dd><Money value={resumo.gorjeta} className="text-foreground" /></dd>
              </div>
            )}

            <div className="flex justify-between gap-3 border-t border-border pt-2">
              <dt className="text-base font-bold text-foreground">Total</dt>
              <dd><Money value={resumo.total} className="text-lg font-extrabold text-foreground" /></dd>
            </div>
          </dl>

          {entrega && (
            <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Entrega estimada em {settings.timeMin}-{settings.timeMax} minutos após a confirmação
            </p>
          )}
        </SectionCard>
      </div>

      <BottomBar
        above={
          foraDeArea ? (
            <div
              role="alert"
              className="flex items-center gap-2 border-t border-destructive/25 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Fora da área de entrega ({resumo.entrega.distancia} km, limite{' '}
              {settings.deliveryMaxKm} km)
            </div>
          ) : faltaLocalizacao ? (
            <button
              type="button"
              onClick={() => navigate('/endereco')}
              className="press flex w-full items-center gap-2 border-t border-secondary/30 bg-secondary/15 px-4 py-2 text-left text-sm font-semibold text-foreground"
            >
              <Navigation className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                Marque o local no mapa para calcularmos a entrega
              </span>
            </button>
          ) : undefined
        }
        left={
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">Total</p>
            <Money value={resumo.total} className="text-lg font-extrabold" />
          </div>
        }
      >
        <BarButton onClick={enviar} disabled={enviando || !podeEnviar}>
          {enviando ? (
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
          ) : (
            <Send className="h-5 w-5" aria-hidden="true" />
          )}
          {enviando ? 'Enviando...' : 'Enviar pedido'}
        </BarButton>
      </BottomBar>
    </div>
  );
};

export default Checkout;
