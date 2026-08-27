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

/**
 * Distância em linha reta entre duas coordenadas (haversine).
 *
 * Espelha `distancia_km` do banco. Aqui serve só para MOSTRAR a taxa antes de
 * fechar o pedido; o valor que vale é o que `create_order` devolve. Se as duas
 * divergirem, quem manda é o servidor.
 */
export const distanciaKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const rad = (g: number) => (g * Math.PI) / 180;
  const cosseno =
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2) - rad(lng1)) +
    Math.sin(rad(lat1)) * Math.sin(rad(lat2));
  // O arredondamento do ponto flutuante pode passar de 1 e quebrar o acos.
  const km = 6371 * Math.acos(Math.min(1, Math.max(-1, cosseno)));
  return Math.round(km * 100) / 100;
};

export interface EntregaCalculada {
  /** Nulo quando não há como medir (falta coordenada). */
  distancia: number | null;
  taxa: number;
  /** Fora do raio atendido: o pedido será recusado. */
  foraDeArea: boolean;
  /** No modo por quilômetro, sem ponto no mapa não dá para calcular. */
  precisaLocalizacao: boolean;
}

/** Espelha `taxa_entrega_para` do banco. */
export const calcularEntrega = (
  settings: Catalog['settings'],
  destino?: { lat: number; lng: number } | null,
): EntregaCalculada => {
  if (settings.deliveryMode !== 'km') {
    return {
      distancia: null,
      taxa: settings.deliveryFee,
      foraDeArea: false,
      precisaLocalizacao: false,
    };
  }

  const lojaSemCoordenada = settings.lat === null || settings.lng === null;

  // Sem coordenada da loja não há como medir: cai na taxa fixa em vez de
  // cobrar zero por engano.
  if (lojaSemCoordenada) {
    return {
      distancia: null,
      taxa: settings.deliveryFee,
      foraDeArea: false,
      precisaLocalizacao: false,
    };
  }

  if (!destino) {
    return {
      distancia: null,
      taxa: settings.deliveryFee,
      foraDeArea: false,
      precisaLocalizacao: true,
    };
  }

  const distancia = distanciaKm(
    settings.lat as number,
    settings.lng as number,
    destino.lat,
    destino.lng,
  );

  if (settings.deliveryMaxKm !== null && distancia > settings.deliveryMaxKm) {
    return { distancia, taxa: 0, foraDeArea: true, precisaLocalizacao: false };
  }

  return {
    distancia,
    taxa:
      Math.round((settings.deliveryBase + settings.deliveryPerKm * distancia) * 100) /
      100,
    foraDeArea: false,
    precisaLocalizacao: false,
  };
};

export interface ResumoPedido {
  subtotal: number;
  /** Desconto em dinheiro. Cupom de frete não entra aqui — ver `entregaGratis`. */
  desconto: number;
  cupom: Coupon | null;
  /** Taxa cheia, para riscar na tela quando o frete for cortesia. */
  taxaEntregaCheia: number;
  taxaEntrega: number;
  entregaGratis: boolean;
  /** Detalhe do cálculo: distância, se falta localização, se está fora de área. */
  entrega: EntregaCalculada;
  taxaServico: number;
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
  destino,
}: {
  catalog: Catalog;
  linhas: LinhaResolvida[];
  deliveryType: DeliveryType;
  couponCode?: string | null;
  /** Ponto de entrega, para o cálculo por distância. */
  destino?: { lat: number; lng: number } | null;
}): ResumoPedido => {
  const { serviceFeeRate, minOrder } = catalog.settings;
  const entrega = calcularEntrega(catalog.settings, destino);
  const deliveryFee = entrega.taxa;
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
    subtotal - desconto + taxaEntrega + taxaServico,
  );
  const faltaParaMinimo = Math.max(0, minOrder - subtotal);

  return {
    subtotal,
    desconto,
    cupom: cupomVale ? cupom : null,
    taxaEntregaCheia,
    taxaEntrega,
    entregaGratis,
    entrega,
    taxaServico,
    total,
    faltaParaMinimo,
    atingiuMinimo: faltaParaMinimo === 0,
  };
};

export const contarItens = (lines: CartLine[]): number =>
  lines.reduce((soma, l) => soma + l.quantity, 0);
