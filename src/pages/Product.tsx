import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { findProduct } from '@/data/products';
import { MAX_OBSERVACAO } from '@/data/config';
import { OptionGroupField } from '@/components/product/OptionGroupField';
import { AppBar } from '@/components/base/AppBar';
import { BarButton, BottomBar } from '@/components/base/BottomBar';
import { Stepper } from '@/components/base/Stepper';
import { useCart } from '@/store/cart';
import { gruposPendentes, resolverLinha } from '@/lib/pricing';
import { formatPrice } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { CartLine } from '@/types/order';
import { cn } from '@/lib/utils';

const novoLineId = () =>
  `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const Product = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { addLine } = useCart();
  const product = findProduct(id);

  const [selections, setSelections] = useState<CartLine['selections']>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [destacarPendente, setDestacarPendente] = useState(false);
  const [imagemOk, setImagemOk] = useState(false);
  const pendenteRef = useRef<HTMLDivElement>(null);

  const pendentes = useMemo(
    () => (product ? gruposPendentes(product, selections) : []),
    [product, selections],
  );

  const preview = useMemo(() => {
    if (!product) return null;
    return resolverLinha({
      lineId: 'preview',
      productId: product.id,
      quantity,
      notes,
      selections,
    });
  }, [product, quantity, notes, selections]);

  // Produto inexistente na URL volta para a loja em vez de quebrar.
  if (!product) return <Navigate to="/" replace />;

  const alterarOpcao = (groupId: string, optionId: string, qtd: number) => {
    setSelections((anterior) => {
      const doGrupo = { ...(anterior[groupId] ?? {}) };
      if (qtd <= 0) delete doGrupo[optionId];
      else doGrupo[optionId] = qtd;

      const proximo = { ...anterior };
      if (Object.keys(doGrupo).length === 0) delete proximo[groupId];
      else proximo[groupId] = doGrupo;
      return proximo;
    });
  };

  /** O aviso acima da barra leva até o grupo que falta. */
  const irParaPendente = () => {
    setDestacarPendente(true);
    pendenteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const adicionar = () => {
    if (pendentes.length > 0) return; // botão está desabilitado; guarda por segurança

    haptic('success');
    addLine({
      lineId: novoLineId(),
      productId: product.id,
      quantity,
      notes: notes.trim().slice(0, MAX_OBSERVACAO),
      selections,
    });
    navigate('/', { replace: true });
  };

  const primeiroPendente = pendentes[0]?.id;

  return (
    <div className="min-h-dvh bg-background pb-bar">
      <AppBar title={product.name} />

      <div className="relative h-56 bg-muted">
        {!imagemOk && (
          <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
        )}
        <img
          src={product.image}
          alt={product.name}
          width={800}
          height={600}
          onLoad={() => setImagemOk(true)}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            imagemOk ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="surface p-4">
          <h1 className="text-xl font-black leading-tight text-foreground">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
          <p className="mt-3">
            {(product.groups?.length ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground">a partir de </span>
            )}
            <span className="text-2xl font-extrabold text-primary">
              {formatPrice(product.price)}
            </span>
          </p>
        </div>

        {product.groups?.map((group) => (
          <div
            key={group.id}
            ref={group.id === primeiroPendente ? pendenteRef : undefined}
            className={cn(
              'rounded-2xl transition-shadow',
              destacarPendente &&
                group.id === primeiroPendente &&
                'ring-2 ring-primary ring-offset-2 ring-offset-background',
            )}
          >
            <OptionGroupField
              group={group}
              selections={selections}
              onChange={alterarOpcao}
            />
          </div>
        ))}

        <div className="surface p-4">
          <label
            htmlFor="observacao"
            className="mb-2 block text-sm font-bold text-foreground"
          >
            Alguma observação?
          </label>
          <textarea
            id="observacao"
            rows={3}
            maxLength={MAX_OBSERVACAO}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: ponto da carne, retirar algum ingrediente"
            className="w-full resize-none rounded-xl border border-border bg-muted/40 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
          <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
            {notes.length}/{MAX_OBSERVACAO}
          </p>
        </div>
      </div>

      <BottomBar
        above={
          pendentes.length > 0 ? (
            <button
              type="button"
              onClick={irParaPendente}
              className="press flex w-full items-center gap-2 border-t border-secondary/30 bg-secondary/15 px-4 py-2 text-left text-sm font-semibold text-foreground"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                Falta escolher: {pendentes.map((g) => g.name).join(', ')}
              </span>
            </button>
          ) : undefined
        }
        left={
          <Stepper
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={99}
            label="quantidade"
            size="sm"
          />
        }
      >
        <BarButton
          onClick={adicionar}
          disabled={pendentes.length > 0}
          aria-label="Adicionar ao pedido"
        >
          <span>Adicionar</span>
          <span className="tabular-nums">{formatPrice(preview?.total ?? 0)}</span>
        </BarButton>
      </BottomBar>
    </div>
  );
};

export default Product;
