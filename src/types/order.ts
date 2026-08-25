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

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

export interface CustomerData {
  name: string;
  deliveryType: 'pickup' | 'delivery';
  paymentMethod: 'pix' | 'card' | 'cash';
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
