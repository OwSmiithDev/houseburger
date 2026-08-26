import { findCoupon, findProduct } from '@/data/catalog';
import type {
  CartLine,
  Catalog,
  Coupon,
  DeliveryType,
  OptionGroup,
  OptionItem,
  Product,
} from '@/types/order';

/**
 * Cálculo do pedido em um lugar só.
 *
 * O catálogo entra por parâmetro em vez de ser importado: os dados agora vêm do
 * banco, e amarrar este módulo a uma origem fixa impediria tanto o admin quanto
 * os testes de calcular sobre outro conjunto.
 *
 * Vale lembrar que este cálculo é para a TELA. O valor que vale é o que
 * `create_order` devolve, porque só o banco pode ser considerado confiável.
 */

export interface LinhaResolvida {
  line: CartLine;
  product: Product;
  escolhas: Array<{ group: OptionGroup; option: OptionItem; quantity: number }>;
  /** Preço de uma unidade, base + acréscimos. */
  unitario: number;
  /** unitario × quantidade */
  total: number;
}

/** Resolve uma linha contra o catálogo. Devolve null se o produto sumiu. */
export const resolverLinha = (
  catalog: Catalog,
  line: CartLine,
): LinhaResolvida | null => {
  const product = findProduct(catalog, line.productId);
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

export const resolverCarrinho = (
  catalog: Catalog,
  lines: CartLine[],
): LinhaResolvida[] =>
  lines
    .map((l) => resolverLinha(catalog, l))
    .filter((l): l is LinhaResolvida => l !== null);

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

/** Grupos obrigatórios que ainda faltam, para explicar por que o botão trava. */
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
  catalog,
  linhas,
  deliveryType,
  couponCode,
  gorjeta = 0,
}: {
  catalog: Catalog;
  linhas: LinhaResolvida[];
  deliveryType: DeliveryType;
  couponCode?: string | null;
  gorjeta?: number;
}): ResumoPedido => {
  const { deliveryFee, serviceFeeRate, minOrder } = catalog.settings;
  const subtotal = linhas.reduce((soma, l) => soma + l.total, 0);

  // O cupom é relido do catálogo pelo código; valor salvo nunca é usado.
  const cupom = couponCode ? findCoupon(catalog, couponCode) ?? null : null;
  const cupomVale = cupom !== null && subtotal >= cupom.minSubtotal;

  const taxaEntregaCheia = deliveryType === 'delivery' ? deliveryFee : 0;

  // Frete grátis aparece na própria linha da taxa, não como desconto — somar
  // nos dois lugares contaria a economia duas vezes.
  const entregaGratis = cupomVale && cupom.type === 'shipping';
  const taxaEntrega = entregaGratis ? 0 : taxaEntregaCheia;

  let desconto = 0;
  if (cupomVale && cupom.type === 'percent') desconto = subtotal * cupom.value;
  if (cupomVale && cupom.type === 'fixed') desconto = cupom.value;
  desconto = Math.min(desconto, subtotal);

  const taxaServico = subtotal * serviceFeeRate;
  const total = Math.max(
    0,
    subtotal - desconto + taxaEntrega + taxaServico + gorjeta,
  );
  const faltaParaMinimo = Math.max(0, minOrder - subtotal);

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
