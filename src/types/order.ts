import type { LucideIcon } from 'lucide-react';
import {
  Beef,
  Cake,
  Citrus,
  Coffee,
  CupSoda,
  Drumstick,
  Flame,
  IceCreamCone,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
} from 'lucide-react';

/** Uma escolha dentro de um grupo. O acréscimo pode ser zero ou negativo. */
export interface OptionItem {
  id: string;
  name: string;
  priceDelta: number;
  soldOut?: boolean;
}

/**
 * Grupo de personalização.
 *
 * `min` e `max` governam a interface e a validação: min 1 e max 1 vira escolha
 * única obrigatória; min 0 e max 5, uma lista de adicionais.
 */
export interface OptionGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  options: OptionItem[];
}

/** Slug da categoria. Deixou de ser união fixa: agora vem do banco. */
export type Category = string;

export interface CategoryInfo {
  id: string;
  slug: Category;
  label: string;
  /** Nome do ícone lucide, resolvido por `iconePorNome`. */
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  /** Preço base. Com grupos, é o "a partir de". */
  price: number;
  image: string;
  category: Category;
  groups?: OptionGroup[];
  featured?: boolean;
  soldOut?: boolean;
}

export interface Coupon {
  code: string;
  description: string;
  /**
   * percent  -> fração do subtotal (0.1 = 10%)
   * fixed    -> valor em reais
   * shipping -> zera a taxa de entrega; `value` é ignorado
   */
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  minSubtotal: number;
}

export interface StoreSettings {
  name: string;
  whatsapp: string;
  pixKey: string;
  banner: string;
  logo: string;
  rating: number;
  ratingsLabel: string;
  timeMin: number;
  timeMax: number;
  deliveryFee: number;
  serviceFeeRate: number;
  minOrder: number;
  tips: number[];
  open: boolean;
}

/** Tudo que o cliente precisa para montar um pedido, em uma carga só. */
export interface Catalog {
  settings: StoreSettings;
  categories: CategoryInfo[];
  products: Product[];
  coupons: Coupon[];
}

/**
 * Uma linha da sacola, não um produto.
 *
 * O mesmo hambúrguer com pães diferentes são pedidos diferentes, então a
 * identidade da linha é própria e não o id do produto.
 */
export interface CartLine {
  lineId: string;
  productId: string;
  quantity: number;
  notes: string;
  /** grupo -> opção -> quantidade */
  selections: Record<string, Record<string, number>>;
}

export type DeliveryType = 'pickup' | 'delivery';

/**
 * Pix é pago antes; os demais acontecem na entrega ou na retirada.
 * `cash` é o único que abre a pergunta do troco.
 */
export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash';

export const pagamentoNaEntrega: PaymentMethod[] = ['credit', 'debit', 'cash'];

export const paymentLabels: Record<PaymentMethod, string> = {
  pix: 'Pix',
  credit: 'Cartão de crédito',
  debit: 'Cartão de débito',
  cash: 'Dinheiro',
};

export interface CustomerData {
  name: string;
  deliveryType: DeliveryType;
  paymentMethod: PaymentMethod;
  /** Troco para quanto. Só faz sentido em dinheiro. */
  changeFor?: number;
  address?: string;
  complement?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * Ícones disponíveis para categoria.
 *
 * O banco guarda o nome; o mapa resolve para o componente. Nome desconhecido
 * cai num padrão neutro em vez de quebrar a tela.
 */
const icones: Record<string, LucideIcon> = {
  Beef,
  Cake,
  Citrus,
  Coffee,
  CupSoda,
  Drumstick,
  Flame,
  IceCreamCone,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
};

export const nomesDeIcone = Object.keys(icones);

export const iconePorNome = (nome: string): LucideIcon =>
  icones[nome] ?? UtensilsCrossed;
