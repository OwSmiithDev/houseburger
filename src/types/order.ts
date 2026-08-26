import type { LucideIcon } from 'lucide-react';
import {
  Beef,
  CupSoda,
  Citrus,
  Flame,
  IceCreamCone,
  Popcorn,
  UtensilsCrossed,
} from 'lucide-react';

/** Uma escolha dentro de um grupo. O acréscimo pode ser zero. */
export interface OptionItem {
  id: string;
  name: string;
  priceDelta: number;
  soldOut?: boolean;
}

/**
 * Grupo de personalização de um produto.
 *
 * `min` e `max` governam tanto a interface quanto a validação do carrinho
 * restaurado: um grupo com min 1 e max 1 vira escolha única; min 0 e max 5,
 * uma lista de adicionais.
 */
export interface OptionGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  options: OptionItem[];
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
  /** Entra no carrossel de destaques da loja. */
  featured?: boolean;
}

/**
 * Uma linha do carrinho, não um produto.
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
export type PaymentMethod = 'pix' | 'card' | 'cash';

export interface CustomerData {
  name: string;
  deliveryType: DeliveryType;
  paymentMethod: PaymentMethod;
  /** Troco para quanto, só faz sentido em dinheiro. */
  changeFor?: number;
  address?: string;
  complement?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export type Category =
  | 'promos'
  | 'burgers'
  | 'fries'
  | 'combos'
  | 'sodas'
  | 'juices'
  | 'creams';

export const categories: Category[] = [
  'promos',
  'burgers',
  'fries',
  'combos',
  'sodas',
  'juices',
  'creams',
];

export const categoryLabels: Record<Category, string> = {
  promos: 'Promoções',
  burgers: 'Hambúrguer',
  fries: 'Batata',
  combos: 'Combos',
  sodas: 'Refri',
  juices: 'Sucos',
  creams: 'Cremes',
};

/**
 * Ícones vetoriais no lugar de emoji: emoji renderiza diferente em cada
 * plataforma, não herda cor do tema e não escala com os tokens de tamanho.
 */
export const categoryIcons: Record<Category, LucideIcon> = {
  promos: Flame,
  burgers: Beef,
  fries: Popcorn,
  combos: UtensilsCrossed,
  sodas: CupSoda,
  juices: Citrus,
  creams: IceCreamCone,
};
