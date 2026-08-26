import { findProduct } from '@/data/products';
import { findCoupon, type Coupon } from '@/data/coupons';
import { PEDIDO_MINIMO, TAXA_ENTREGA, TAXA_SERVICO } from '@/data/config';
import type { CartLine, DeliveryType, OptionGroup, Product } from '@/types/order';

/**
 * Cálculo do pedido em um lugar só.
 *
 * Antes o total era refeito em quatro componentes diferentes, o que abre espaço
 * para a tela mostrar um valor e a comanda enviar outro. Tudo aqui parte do
 * catálogo — nada de preço vindo do armazenamento local.
 */

export interface LinhaResolvida {
  line: CartLine;
  product: Product;
  /** Grupo e opção já resolvidos, na ordem em que o produto os declara. */
  escolhas: Array<{ group: OptionGroup; option: { id: string; name: string; priceDelta: number }; quantity: number }>;
  /** Preço de uma unidade, base + acréscimos. */
  unitario: number;
  /** unitario × quantidade */
  total: number;
}

/** Resolve uma linha contra o catálogo. Devolve null se o produto sumiu. */
export const resolverLinha = (line: CartLine): LinhaResolvida | null => {
  const product = findProduct(line.productId);
  if (!product) return null;

  const escolhas: LinhaResolvida['escolhas'] = [];
  let unitario = product.price;

  for (const group of product.groups ?? []) {
    const marcadas = line.selections[group.id] ?? {};
    for (const option of group.options) {
      const quantity = marcadas[option.id] ?? 0;
      if (quantity <= 0) continue;
      escolhas.push({ group, option, quantity });
      unitario += option.priceDelta * quantity;
    }
  }

  // Um acréscimo negativo mal configurado não pode gerar preço abaixo de zero.
  unitario = Math.max(0, unitario);

  return { line, product, escolhas, unitario, total: unitario * line.quantity };
};

export const resolverCarrinho = (lines: CartLine[]): LinhaResolvida[] =>
  lines.map(resolverLinha).filter((l): l is LinhaResolvida => l !== null);

/** Um grupo obrigatório está satisfeito quando o total marcado atinge `min`. */
export const totalMarcado = (
  selections: CartLine['selections'],
  groupId: string,
): number =>
  Object.values(selections[groupId] ?? {}).reduce((soma, q) => soma + q, 0);

export const grupoPendente = (
  group: OptionGroup,
  selections: CartLine['selections'],
): boolean => totalMarcado(selections, group.id) < group.min;

/** Grupos obrigatórios que ainda faltam, para explicar por que o botão está travado. */
export const gruposPendentes = (
  product: Product,
  selections: CartLine['selections'],
): OptionGroup[] =>
  (product.groups ?? []).filter((g) => grupoPendente(g, selections));

export interface ResumoPedido {
  subtotal: number;
  /** Desconto em dinheiro. Cupom de frete não entra aqui — ver `entregaGratis`. */
  desconto: number;
  cupom: Coupon | null;
  /** Taxa cheia, para riscar na tela quando o frete for cortesia. */
  taxaEntregaCheia: number;
  /** O que de fato entra na conta. */
  taxaEntrega: number;
  entregaGratis: boolean;
  taxaServico: number;
  gorjeta: number;
  total: number;
  /** Quanto falta para atingir o pedido mínimo. Zero quando já atingiu. */
  faltaParaMinimo: number;
  atingiuMinimo: boolean;
}

export const calcularResumo = ({
  linhas,
  deliveryType,
  couponCode,
  gorjeta = 0,
}: {
  linhas: LinhaResolvida[];
  deliveryType: DeliveryType;
  couponCode?: string | null;
  gorjeta?: number;
}): ResumoPedido => {
  const subtotal = linhas.reduce((soma, l) => soma + l.total, 0);

  // O cupom é relido do catálogo pelo código; valor salvo nunca é usado.
  const cupom = couponCode ? findCoupon(couponCode) ?? null : null;
  const cupomVale = cupom !== null && subtotal >= cupom.minSubtotal;

  const taxaEntregaCheia = deliveryType === 'delivery' ? TAXA_ENTREGA : 0;

  // Frete grátis aparece na própria linha da taxa, não como desconto — somar
  // nos dois lugares contaria a economia duas vezes.
  const entregaGratis = cupomVale && cupom.type === 'shipping';
  const taxaEntrega = entregaGratis ? 0 : taxaEntregaCheia;

  let desconto = 0;
  if (cupomVale && cupom.type === 'percent') desconto = subtotal * cupom.value;
  if (cupomVale && cupom.type === 'fixed') desconto = cupom.value;
  desconto = Math.min(desconto, subtotal);

  const taxaServico = subtotal * TAXA_SERVICO;
  const total = Math.max(
    0,
    subtotal - desconto + taxaEntrega + taxaServico + gorjeta,
  );
  const faltaParaMinimo = Math.max(0, PEDIDO_MINIMO - subtotal);

  return {
    subtotal,
    desconto,
    cupom: cupomVale ? cupom : null,
    taxaEntregaCheia,
    taxaEntrega,
    entregaGratis,
    taxaServico,
    gorjeta,
    total,
    faltaParaMinimo,
    atingiuMinimo: faltaParaMinimo === 0,
  };
};

export const contarItens = (lines: CartLine[]): number =>
  lines.reduce((soma, l) => soma + l.quantity, 0);
