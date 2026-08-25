import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  MapPin,
  Navigation,
  QrCode,
  Send,
  Store,
  Truck,
} from 'lucide-react';
import { CartItem, CustomerData } from '@/types/order';
import { formatPrice } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { toast } from 'sonner';

interface CheckoutFlowProps {
  items: CartItem[];
  onBack: () => void;
  onComplete: () => void;
}

type Step = 'delivery-type' | 'customer-info';
type FieldErrors = Partial<Record<'name' | 'address', string>>;

const WHATSAPP_NUMBER = '5562999718912';

const paymentOptions = [
  { value: 'pix', label: 'PIX', icon: QrCode },
  { value: 'card', label: 'Cartão', icon: CreditCard },
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
] as const;

/**
 * Separador em ASCII puro. A versão anterior usava U+2501 (traço pesado de
 * desenho de caixa), que não existe em muitas fontes de sistema e chegava à
 * cozinha como uma fileira de "?" — eram 72 desses por comanda.
 */
const SEPARADOR = '--------------------';

/**
 * Última barreira antes de a comanda sair do aplicativo.
 *
 * A mensagem é texto simples lido em telefones e desktops variados, muitos com
 * fontes incompletas. Aqui caem os caracteres que parecem inofensivos no
 * editor mas chegam corrompidos do outro lado:
 *
 * - U+00A0 e U+202F: espaços inseparáveis que o Intl insere nos preços;
 * - U+FE0F: seletor de variação que acompanha alguns emoji e vira quadrado
 *   sozinho quando a fonte não tem o desenho colorido;
 * - U+200B, U+200E, U+200F e U+FEFF: marcas invisíveis de direção e quebra
 *   que podem entrar por colagem no nome ou no endereço.
 */
const limparParaWhatsApp = (texto: string) =>
  texto
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/[\uFE0F\u200B\u200E\u200F\uFEFF]/g, '')
    .replace(/[ \t]+\n/g, '\n');

/**
 * Formato documentado pelo Google (Maps URLs, api=1). A forma antiga
 * (maps?q=lat,lng) é legada e depende de redirecionamento, o que atrapalha a
 * abertura no aplicativo nativo do celular.
 *
 * Seis casas decimais equivalem a cerca de 11 cm — mais que suficiente para
 * uma entrega, e evita arrastar o ruído do ponto flutuante para a URL.
 */
const mapsUrl = ({ lat, lng }: { lat: number; lng: number }) =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;

export const CheckoutFlow = ({ items, onBack, onComplete }: CheckoutFlowProps) => {
  const [step, setStep] = useState<Step>('delivery-type');
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    deliveryType: 'pickup',
    paymentMethod: 'pix',
    address: '',
    complement: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLocating, setIsLocating] = useState(false);

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const isDelivery = customerData.deliveryType === 'delivery';

  const update = <K extends keyof CustomerData>(key: K, value: CustomerData[K]) => {
    setCustomerData((prev) => ({ ...prev, [key]: value }));
  };

  /** Limpa o erro assim que o usuário corrige — validação não deve punir a digitação */
  const clearError = (field: keyof FieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};
    if (!customerData.name.trim()) {
      found.name = 'Informe seu nome para identificarmos o pedido.';
    }
    if (isDelivery && !customerData.address?.trim()) {
      found.address = 'Informe o endereço para a entrega.';
    }
    return found;
  };

  const getLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocalização não é suportada neste navegador');
      return;
    }

    // A API existe no objeto navigator mesmo em origem insegura, mas sempre
    // falha por lá. Sem esta checagem, abrir o app pelo IP da rede local
    // (http://192.168.x.x) resulta em "permissão negada" sem explicação.
    if (!window.isSecureContext) {
      toast.error('Localização exige HTTPS', {
        description:
          'Abra o site por um endereço https:// para usar o mapa. Você pode seguir informando o endereço por escrito.',
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update('location', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        haptic('success');
        toast.success('Localização capturada com sucesso!');
        setIsLocating(false);
      },
      (error) => {
        // O motivo da falha muda completamente o que o usuário deve fazer,
        // então cada código recebe sua própria orientação.
        const mensagens: Record<number, string> = {
          [error.PERMISSION_DENIED]:
            'Permissão negada. Autorize o acesso à localização nas configurações do navegador.',
          [error.POSITION_UNAVAILABLE]:
            'Não foi possível determinar sua posição. Verifique se o GPS está ligado.',
          [error.TIMEOUT]:
            'A busca demorou demais. Tente de novo, de preferência perto de uma janela.',
        };

        toast.error('Não foi possível obter sua localização', {
          description: mensagens[error.code] ?? 'Informe o endereço por escrito.',
        });
        setIsLocating(false);
      },
      // 10s com alta precisão costuma estourar em ambiente fechado; aceitar
      // uma leitura recente do cache resolve a maioria das segundas tentativas.
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  };

  const generateWhatsAppMessage = () => {
    const itemsList = items
      .map(
        (item) =>
          `• ${item.quantity}x ${item.product.name} - ${formatPrice(
            item.product.price * item.quantity,
          )}${item.notes ? `\n   Obs: ${item.notes}` : ''}`,
      )
      .join('\n');

    const paymentLabels = {
      pix: 'PIX',
      card: 'Cartão (Crédito/Débito)',
      cash: 'Dinheiro',
    };

    let message = `*NOVO PEDIDO*\n\n`;
    message += `*Cliente:* ${customerData.name}\n`;
    message += `*Tipo:* ${isDelivery ? 'ENTREGA' : 'RETIRADA'}\n\n`;
    message += `${SEPARADOR}\n`;
    message += `*ITENS DO PEDIDO:*\n\n`;
    message += `${itemsList}\n\n`;
    message += `${SEPARADOR}\n`;
    message += `*TOTAL: ${formatPrice(total)}*\n`;
    message += `*Pagamento:* ${paymentLabels[customerData.paymentMethod]}\n`;

    if (isDelivery) {
      message += `\n${SEPARADOR}\n`;
      message += `*ENDEREÇO DE ENTREGA:*\n`;
      message += `${customerData.address}\n`;
      if (customerData.complement) {
        message += `Complemento: ${customerData.complement}\n`;
      }
      if (customerData.location) {
        message += `\n*Localização no Maps:*\n${mapsUrl(customerData.location)}\n`;
      }
    }

    message += `\n${SEPARADOR}\n`;
    message += `Aguardando confirmação do pedido!`;

    return encodeURIComponent(limparParaWhatsApp(message));
  };

  const handleSubmit = () => {
    const found = validate();

    if (Object.keys(found).length > 0) {
      setErrors(found);
      haptic('warning');
      // Leva o foco ao primeiro campo com problema em vez de só avisar no topo
      const firstField = Object.keys(found)[0];
      document.getElementById(firstField)?.focus();
      return;
    }

    haptic('success');
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${generateWhatsAppMessage()}`,
      '_blank',
      'noopener,noreferrer',
    );
    toast.success('Redirecionando para o WhatsApp...');
    onComplete();
  };

  const selectDeliveryType = (type: CustomerData['deliveryType']) => {
    haptic('light');
    update('deliveryType', type);
    setStep('customer-info');
  };

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border-2 bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${
      hasError ? 'border-destructive' : 'border-border focus:border-ring'
    }`;

  return (
    /* h-dvh em vez de h-screen + calc: 100vh no mobile conta a barra do
       navegador, então o rodapé fixo ficava fora da tela ao rolar. */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Finalizar pedido"
      className="fixed inset-0 z-50 flex h-dvh flex-col bg-background"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 pb-3 pt-safe">
        <button
          type="button"
          onClick={step === 'customer-info' ? () => setStep('delivery-type') : onBack}
          aria-label="Voltar"
          className="press-sm mt-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="mt-3 flex-1">
          <h2 className="text-lg font-bold text-foreground">Finalizar Pedido</h2>
          <p className="text-sm text-muted-foreground">
            {step === 'delivery-type' ? 'Como deseja receber?' : 'Seus dados'}
          </p>
        </div>

        {/* Indicador de etapa: mostra onde o usuário está e quanto falta */}
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-6 rounded-full bg-primary" />
          <span
            className={`h-1.5 w-6 rounded-full transition-colors ${
              step === 'customer-info' ? 'bg-primary' : 'bg-muted'
            }`}
          />
        </div>
        <span className="sr-only">
          Etapa {step === 'delivery-type' ? 1 : 2} de 2
        </span>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        {step === 'delivery-type' ? (
          <div className="animate-slide-down space-y-4">
            <h3 className="mb-4 text-xl font-bold text-foreground">O pedido será:</h3>

            <button
              type="button"
              onClick={() => selectDeliveryType('pickup')}
              className="press flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-5 text-left"
            >
              <span className="gradient-hero flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
                <Store className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xl font-bold text-foreground">Retirada</span>
                <span className="block text-muted-foreground">
                  Retire seu pedido no balcão
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => selectDeliveryType('delivery')}
              className="press flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-5 text-left"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                <Truck className="h-7 w-7 text-secondary-foreground" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xl font-bold text-foreground">Entrega</span>
                <span className="block text-muted-foreground">
                  Receba no seu endereço
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div className="animate-slide-down space-y-6">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-foreground"
              >
                Seu Nome <span className="text-destructive">*</span>
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                maxLength={80}
                enterKeyHint="next"
                placeholder="Digite seu nome"
                value={customerData.name}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
                onChange={(event) => {
                  update('name', event.target.value);
                  clearError('name');
                }}
                className={inputClass(Boolean(errors.name))}
              />
              {/* Erro junto do campo, não só em um toast que some */}
              {errors.name && (
                <p
                  id="name-error"
                  role="alert"
                  className="mt-2 flex items-center gap-1.5 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {errors.name}
                </p>
              )}
            </div>

            {isDelivery && (
              <>
                <div>
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    Endereço Completo <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="address"
                    type="text"
                    autoComplete="street-address"
                    maxLength={200}
                    enterKeyHint="next"
                    placeholder="Rua, número, bairro"
                    value={customerData.address}
                    aria-invalid={Boolean(errors.address)}
                    aria-describedby={errors.address ? 'address-error' : undefined}
                    onChange={(event) => {
                      update('address', event.target.value);
                      clearError('address');
                    }}
                    className={inputClass(Boolean(errors.address))}
                  />
                  {errors.address && (
                    <p
                      id="address-error"
                      role="alert"
                      className="mt-2 flex items-center gap-1.5 text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {errors.address}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="complement"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    Complemento
                  </label>
                  <input
                    id="complement"
                    type="text"
                    enterKeyHint="done"
                    maxLength={120}
                    placeholder="Quadra, lote, bloco, referência..."
                    value={customerData.complement}
                    onChange={(event) => update('complement', event.target.value)}
                    className={inputClass(false)}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Opcional — ajuda o entregador a te encontrar mais rápido.
                  </p>
                </div>

                <div>
                  <span className="mb-2 block text-sm font-semibold text-foreground">
                    Localização no Mapa
                  </span>
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={isLocating}
                    aria-live="polite"
                    className={`press flex w-full items-center justify-center gap-3 rounded-xl border-2 py-4 font-semibold transition-colors disabled:opacity-70 ${
                      customerData.location
                        ? 'border-success bg-success/15 text-success'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    {isLocating ? (
                      <>
                        <span
                          className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
                          aria-hidden="true"
                        />
                        <span>Obtendo localização...</span>
                      </>
                    ) : customerData.location ? (
                      <>
                        <MapPin className="h-5 w-5" aria-hidden="true" />
                        <span>Localização capturada</span>
                        <Check className="h-5 w-5" aria-hidden="true" />
                      </>
                    ) : (
                      <>
                        <Navigation className="h-5 w-5" aria-hidden="true" />
                        <span>Usar minha localização atual</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-foreground">
                Forma de Pagamento <span className="text-destructive">*</span>
              </legend>
              <div className="grid grid-cols-3 gap-3" role="radiogroup">
                {paymentOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = customerData.paymentMethod === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        haptic('light');
                        update('paymentMethod', value);
                      }}
                      className={`press relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/15 text-foreground'
                          : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      {/* Marca de seleção além da cor: cor sozinha não comunica estado */}
                      {isSelected && (
                        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                          <Check
                            className="h-3 w-3 text-primary-foreground"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        </span>
                      )}
                      <Icon className="h-6 w-6" aria-hidden="true" />
                      <span className="text-sm font-semibold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 font-bold text-foreground">Resumo do Pedido</h3>
              <ul className="space-y-2 text-sm">
                {items.map((item) => (
                  <li
                    key={item.product.id}
                    className="flex justify-between gap-3 text-muted-foreground"
                  >
                    <span>
                      {item.quantity}x {item.product.name}
                    </span>
                    <span className="tabular-nums">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-border pt-3">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-gradient text-xl font-extrabold tabular-nums">
                  {formatPrice(total)}
                </span>
              </div>
            </section>
          </div>
        )}
      </div>

      {step === 'customer-info' && (
        <div className="shrink-0 border-t border-border bg-background px-4 pb-safe pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            className="gradient-hero press mb-4 flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-lg font-bold text-primary-foreground shadow-button"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
            <span>Enviar Pedido via WhatsApp</span>
          </button>
        </div>
      )}
    </div>
  );
};
