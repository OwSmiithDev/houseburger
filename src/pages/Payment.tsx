import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, Check, CreditCard, Info, QrCode } from 'lucide-react';
import { AppBar } from '@/components/base/AppBar';
import { BarButton, BottomBar } from '@/components/base/BottomBar';
import { SectionCard } from '@/components/base/primitives';
import { useCheckout } from '@/store/checkout';
import { useCart } from '@/store/cart';
import { calcularResumo } from '@/lib/pricing';
import { formatPrice } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { PaymentMethod } from '@/types/order';

const opcoes: Array<{
  value: PaymentMethod;
  label: string;
  desc: string;
  icon: typeof QrCode;
}> = [
  { value: 'pix', label: 'PIX', desc: 'A chave é enviada na confirmação', icon: QrCode },
  { value: 'card', label: 'Cartão', desc: 'Maquininha na entrega', icon: CreditCard },
  { value: 'cash', label: 'Dinheiro', desc: 'Informe se precisa de troco', icon: Banknote },
];

const Payment = () => {
  const navigate = useNavigate();
  const { customer, setCustomer } = useCheckout();
  const { linhas, couponCode } = useCart();
  const resumo = calcularResumo({
    linhas,
    deliveryType: customer.deliveryType,
    couponCode,
  });

  const [troco, setTroco] = useState(
    customer.changeFor ? String(customer.changeFor).replace('.', ',') : '',
  );
  const [erroTroco, setErroTroco] = useState('');

  const trocoNumero = Number(troco.replace(',', '.'));
  const trocoInvalido =
    customer.paymentMethod === 'cash' &&
    troco.trim() !== '' &&
    (!Number.isFinite(trocoNumero) || trocoNumero < resumo.total);

  const confirmar = () => {
    if (customer.paymentMethod === 'cash') {
      if (troco.trim() === '') {
        setCustomer({ changeFor: undefined });
      } else if (trocoInvalido) {
        setErroTroco(
          `O valor precisa ser pelo menos o total do pedido (${formatPrice(resumo.total)}).`,
        );
        haptic('warning');
        return;
      } else {
        setCustomer({ changeFor: trocoNumero });
      }
    } else {
      setCustomer({ changeFor: undefined });
    }
    haptic('success');
    navigate(-1);
  };

  return (
    <div className="min-h-dvh bg-background pb-bar">
      <AppBar title="Forma de pagamento" fallback="/checkout" />

      <div className="space-y-3 px-4 py-4">
        {/* Sem backend não há como cobrar dentro do aplicativo. Dizer isso é
            mais honesto do que exibir abas de pagamento que não funcionam. */}
        <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            O pagamento acontece na entrega ou na retirada. Aqui você só informa como
            pretende pagar, e isso vai junto no pedido.
          </p>
        </div>

        <SectionCard className="p-0">
          <div role="radiogroup" aria-label="Forma de pagamento">
            {opcoes.map(({ value, label, desc, icon: Icone }, i) => {
              const ativo = customer.paymentMethod === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => {
                    haptic('light');
                    setCustomer({ paymentMethod: value });
                    setErroTroco('');
                  }}
                  className={cn(
                    'press-sm flex w-full items-center gap-3 px-4 py-4 text-left',
                    i > 0 && 'border-t border-border',
                  )}
                >
                  <Icone
                    className={cn('h-6 w-6 shrink-0', ativo ? 'text-primary' : 'text-muted-foreground')}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">{label}</span>
                    <span className="block text-xs text-muted-foreground">{desc}</span>
                  </span>
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      ativo ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                    )}
                  >
                    {ativo && (
                      <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} aria-hidden="true" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {customer.paymentMethod === 'cash' && (
          <SectionCard className="animate-slide-down">
            <label htmlFor="troco" className="mb-2 block text-sm font-bold text-foreground">
              Precisa de troco para quanto?
            </label>
            <input
              id="troco"
              type="text"
              inputMode="decimal"
              value={troco}
              onChange={(e) => {
                setTroco(e.target.value.replace(/[^0-9,.]/g, ''));
                setErroTroco('');
              }}
              placeholder="Deixe vazio se não precisar"
              aria-invalid={Boolean(erroTroco)}
              aria-describedby={erroTroco ? 'troco-error' : 'troco-hint'}
              className={cn(
                'h-12 w-full rounded-xl border-2 bg-card px-4 text-foreground placeholder:text-muted-foreground focus:outline-none',
                erroTroco ? 'border-destructive' : 'border-border focus:border-ring',
              )}
            />
            {erroTroco ? (
              <p id="troco-error" role="alert" className="mt-2 text-sm text-destructive">
                {erroTroco}
              </p>
            ) : (
              <p id="troco-hint" className="mt-2 text-xs text-muted-foreground">
                Total do pedido: {formatPrice(resumo.total)}
              </p>
            )}
          </SectionCard>
        )}
      </div>

      <BottomBar>
        <BarButton onClick={confirmar}>Confirmar</BarButton>
      </BottomBar>
    </div>
  );
};

export default Payment;
