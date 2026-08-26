import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Ticket, Utensils, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppBar } from '@/components/base/AppBar';
import { BarButton, BottomBar } from '@/components/base/BottomBar';
import { Stepper } from '@/components/base/Stepper';
import { Money, Pill } from '@/components/base/primitives';
import { useCart } from '@/store/cart';
import { calcularResumo } from '@/lib/pricing';
import { findCoupon } from '@/data/coupons';
import { PEDIDO_MINIMO } from '@/data/config';
import { formatPrice } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const Cart = () => {
  const navigate = useNavigate();
  const {
    linhas,
    lines,
    couponCode,
    setQuantity,
    removeLine,
    addLine,
    setCoupon,
    cutlery,
    setCutlery,
    clearCart,
  } = useCart();

  const [codigo, setCodigo] = useState('');
  const [abrindoCupom, setAbrindoCupom] = useState(false);

  const resumo = calcularResumo({ linhas, deliveryType: 'delivery', couponCode });

  const aplicarCupom = () => {
    const cupom = findCoupon(codigo);
    if (!cupom) {
      haptic('warning');
      toast.error('Cupom inválido', { description: 'Confira o código digitado.' });
      return;
    }
    if (resumo.subtotal < cupom.minSubtotal) {
      haptic('warning');
      toast.error('Cupom não aplicável', {
        description: `Válido em pedidos a partir de ${formatPrice(cupom.minSubtotal)}.`,
      });
      return;
    }
    haptic('success');
    setCoupon(cupom.code);
    setCodigo('');
    setAbrindoCupom(false);
    toast.success('Cupom aplicado', { description: cupom.description });
  };

  const remover = (lineId: string) => {
    const alvo = linhas.find((l) => l.line.lineId === lineId);
    removeLine(lineId);
    if (!alvo) return;
    toast('Item removido', {
      description: alvo.product.name,
      action: { label: 'Desfazer', onClick: () => addLine(alvo.line) },
    });
  };

  if (lines.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <AppBar title="Sacola" />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <ShoppingBag
            className="mb-4 h-16 w-16 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="text-lg font-bold text-foreground">Sua sacola está vazia</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha algo delicioso no cardápio.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="press mt-6 h-12 rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-button"
          >
            Ver cardápio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-bar">
      <AppBar
        title="Sacola"
        subtitle={`${linhas.length} ${linhas.length === 1 ? 'item' : 'itens'}`}
        right={
          <button
            type="button"
            onClick={() => {
              clearCart();
              toast('Sacola esvaziada');
            }}
            className="press-sm tap-target px-3 text-sm font-semibold text-muted-foreground"
          >
            Limpar
          </button>
        }
      />

      <div className="space-y-3 px-4 py-4">
        <div className="surface divide-y divide-border">
          {linhas.map(({ line, product, escolhas, total }) => (
            <article key={line.lineId} className="p-4">
              <div className="flex gap-3">
                <img
                  src={product.image}
                  alt=""
                  width={72}
                  height={72}
                  loading="lazy"
                  className="h-[72px] w-[72px] shrink-0 rounded-xl bg-muted object-cover"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold leading-snug text-foreground">
                      {product.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => remover(line.lineId)}
                      aria-label={`Remover ${product.name} da sacola`}
                      className="press-sm -mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>

                  {/* O que foi escolhido fica visível: sem isto, duas linhas do
                      mesmo produto ficariam indistinguíveis. */}
                  {escolhas.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {escolhas.map(({ group, option, quantity }) => (
                        <li
                          key={`${group.id}-${option.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          <span className="font-semibold">{group.name}:</span>{' '}
                          {quantity > 1 && `${quantity}x `}
                          {option.name}
                        </li>
                      ))}
                    </ul>
                  )}

                  {line.notes && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      Obs.: {line.notes}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Money value={total} className="text-base font-extrabold text-foreground" />
                    <Stepper
                      value={line.quantity}
                      onChange={(q) => setQuantity(line.lineId, q)}
                      onRemove={() => remover(line.lineId)}
                      label={product.name}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="surface flex items-center gap-3 p-4">
          <Utensils className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-sm font-semibold text-foreground" id="rotulo-talheres">
            Enviar talheres
          </span>
          {/* Interruptor no lugar de checkbox: a caixa nativa de 24px fica
              abaixo do alvo mínimo de toque e não dá para ampliar sem
              distorcer o desenho. */}
          <button
            type="button"
            role="switch"
            aria-checked={cutlery}
            aria-labelledby="rotulo-talheres"
            onClick={() => {
              haptic('light');
              setCutlery(!cutlery);
            }}
            className="press-sm tap-target relative flex shrink-0 items-center justify-center"
          >
            <span
              className={cn(
                'flex h-7 w-12 items-center rounded-full p-1 transition-colors',
                cutlery ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-full bg-card shadow-card transition-transform',
                  cutlery && 'translate-x-5',
                )}
              />
            </span>
          </button>
        </div>

        <div className="surface p-4">
          {resumo.cupom ? (
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{resumo.cupom.code}</p>
                <p className="truncate text-xs text-success">
                  {resumo.cupom.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCoupon(null);
                  toast('Cupom removido');
                }}
                className="press-sm tap-target px-2 text-sm font-semibold text-muted-foreground"
              >
                Remover
              </button>
            </div>
          ) : abrindoCupom ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Código do cupom"
                aria-label="Código do cupom"
                className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-muted/40 px-3 uppercase text-foreground placeholder:normal-case placeholder:text-muted-foreground focus:border-ring focus:outline-none"
              />
              <button
                type="button"
                onClick={aplicarCupom}
                className="press h-12 shrink-0 rounded-xl bg-primary px-4 font-bold text-primary-foreground"
              >
                Aplicar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAbrindoCupom(true)}
              className="press-sm flex min-h-11 w-full items-center gap-3 text-left"
            >
              <Ticket className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              <span className="flex-1 text-sm font-semibold text-foreground">
                Tem um cupom de desconto?
              </span>
              <Pill tone="saving">Aplicar</Pill>
            </button>
          )}
        </div>
      </div>

      <BottomBar
        above={
          !resumo.atingiuMinimo ? (
            <div className="border-t border-secondary/30 bg-secondary/15 px-4 py-2 text-center text-sm font-semibold text-foreground">
              Faltam {formatPrice(resumo.faltaParaMinimo)} para o mínimo de{' '}
              {formatPrice(PEDIDO_MINIMO)}
            </div>
          ) : undefined
        }
        left={
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <Money value={resumo.subtotal} className="text-lg font-extrabold" />
          </div>
        }
      >
        <BarButton
          onClick={() => navigate('/checkout')}
          disabled={!resumo.atingiuMinimo}
        >
          Continuar
        </BarButton>
      </BottomBar>
    </div>
  );
};

export default Cart;
