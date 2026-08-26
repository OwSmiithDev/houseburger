import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  Check,
  Copy,
  CreditCard,
  HandCoins,
  Info,
  QrCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppBar } from '@/components/base/AppBar';
import { BarButton, BottomBar } from '@/components/base/BottomBar';
import { SectionCard } from '@/components/base/primitives';
import { useCheckout } from '@/store/checkout';
import { useCart } from '@/store/cart';
import { calcularResumo } from '@/lib/pricing';
import { formatPrice } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { pagamentoNaEntrega, type PaymentMethod } from '@/types/order';

/** Opções que aparecem depois de escolher "Na entrega". */
const naEntrega: Array<{
  value: PaymentMethod;
  label: string;
  desc: string;
  icon: typeof CreditCard;
}> = [
  { value: 'credit', label: 'Cartão de crédito', desc: 'Maquininha na entrega', icon: CreditCard },
  { value: 'debit', label: 'Cartão de débito', desc: 'Maquininha na entrega', icon: CreditCard },
  { value: 'cash', label: 'Dinheiro', desc: 'Informe se precisa de troco', icon: Banknote },
];

const Payment = () => {
  const navigate = useNavigate();
  const { customer, setCustomer } = useCheckout();
  const { catalog, linhas, couponCode } = useCart();
  const resumo = calcularResumo({
    catalog,
    linhas,
    deliveryType: customer.deliveryType,
    couponCode,
  });

  /*
   * Dois níveis: primeiro "Pix" ou "Na entrega"; só então a forma específica.
   * O nível de cima é derivado do método já escolhido, para quem volta à tela
   * encontrar tudo como deixou.
   */
  const [momento, setMomento] = useState<'pix' | 'entrega'>(
    customer.paymentMethod === 'pix' ? 'pix' : 'entrega',
  );

  const [troco, setTroco] = useState(
    customer.changeFor ? String(customer.changeFor).replace('.', ',') : '',
  );
  const [erroTroco, setErroTroco] = useState('');

  const trocoNumero = Number(troco.replace(',', '.'));
  const ehDinheiro = momento === 'entrega' && customer.paymentMethod === 'cash';

  const escolherMomento = (novo: 'pix' | 'entrega') => {
    haptic('light');
    setMomento(novo);
    setErroTroco('');
    // Trocar de nível sem definir o de baixo deixaria um estado incoerente.
    if (novo === 'pix') setCustomer({ paymentMethod: 'pix', changeFor: undefined });
    else if (!pagamentoNaEntrega.includes(customer.paymentMethod)) {
      setCustomer({ paymentMethod: 'credit' });
    }
  };

  const copiarPix = async () => {
    try {
      await navigator.clipboard.writeText(catalog.settings.pixKey);
      haptic('success');
      toast.success('Chave Pix copiada');
    } catch {
      toast.error('Não foi possível copiar', {
        description: 'Selecione a chave e copie manualmente.',
      });
    }
  };

  const confirmar = () => {
    if (ehDinheiro) {
      if (troco.trim() === '') {
        setCustomer({ changeFor: undefined });
      } else if (!Number.isFinite(trocoNumero) || trocoNumero < resumo.total) {
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

  const opcaoNivel1 = (
    valor: 'pix' | 'entrega',
    Icone: typeof QrCode,
    titulo: string,
    descricao: string,
  ) => {
    const ativo = momento === valor;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={ativo}
        onClick={() => escolherMomento(valor)}
        className={cn(
          'press flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors',
          ativo ? 'border-primary bg-primary/8' : 'border-border bg-card',
        )}
      >
        <Icone
          className={cn('h-6 w-6 shrink-0', ativo ? 'text-primary' : 'text-muted-foreground')}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-foreground">{titulo}</span>
          <span className="block text-xs text-muted-foreground">{descricao}</span>
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
  };

  return (
    <div className="min-h-dvh bg-background pb-bar">
      <AppBar title="Forma de pagamento" fallback="/checkout" />

      <div className="space-y-3 px-4 py-4">
        {/* O aplicativo não cobra nada: dizer isso é mais honesto que exibir
            uma tela de pagamento que não processa. */}
        <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Nada é cobrado aqui. Você informa como pretende pagar e acerta com a
            loja no Pix ou na hora da entrega.
          </p>
        </div>

        <div className="space-y-2" role="radiogroup" aria-label="Quando pagar">
          {opcaoNivel1('pix', QrCode, 'Pix', 'Pague antes, pela chave da loja')}
          {opcaoNivel1('entrega', HandCoins, 'Na entrega', 'Cartão ou dinheiro com o entregador')}
        </div>

        {momento === 'pix' && (
          <SectionCard className="animate-slide-down">
            <h2 className="text-sm font-bold text-foreground">Chave Pix da loja</h2>
            {catalog.settings.pixKey ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-xl bg-muted px-3 py-3 text-sm text-foreground">
                    {catalog.settings.pixKey}
                  </code>
                  <button
                    type="button"
                    onClick={copiarPix}
                    aria-label="Copiar chave Pix"
                    className="press-sm tap-target flex items-center justify-center rounded-xl bg-primary px-3 text-primary-foreground"
                  >
                    <Copy className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Envie o comprovante na conversa do WhatsApp para a loja
                  confirmar o pedido.
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                A loja ainda não cadastrou a chave. Ela será enviada na conversa
                do WhatsApp.
              </p>
            )}
          </SectionCard>
        )}

        {momento === 'entrega' && (
          <SectionCard className="animate-slide-down p-0">
            <h2 className="border-b border-border px-4 py-3 text-sm font-bold text-foreground">
              Como vai pagar na entrega?
            </h2>
            <div role="radiogroup" aria-label="Forma de pagamento na entrega">
              {naEntrega.map(({ value, label, desc, icon: Icone }, i) => {
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
        )}

        {ehDinheiro && (
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
                {Number.isFinite(trocoNumero) && trocoNumero > resumo.total && (
                  <> · troco de {formatPrice(trocoNumero - resumo.total)}</>
                )}
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
