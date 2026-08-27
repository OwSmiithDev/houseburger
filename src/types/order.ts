import type { LucideIcon } from 'lucide-react';
import {
  Apple,
  Beef,
  Beer,
  Cake,
  Candy,
  Carrot,
  CherryIcon,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  Flame,
  Grape,
  Ham,
  IceCreamCone,
  Leaf,
  Martini,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shell,
  Soup,
  UtensilsCrossed,
  Wheat,
  Wine,
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
  serviceFeeRate: number;
  minOrder: number;
  open: boolean;

  /** Endereço da loja, mostrado a quem escolhe retirar. */
  address: string;
  /** Coordenadas da loja: base do cálculo por distância e do link do mapa. */
  lat: number | null;
  lng: number | null;

  /** 'fixo' = taxa única; 'km' = base + valor por quilômetro. */
  deliveryMode: 'fixo' | 'km';
  /** Taxa única, usada no modo fixo e como reserva quando falta coordenada. */
  deliveryFee: number;
  /** Parcela fixa cobrada antes dos quilômetros. */
  deliveryBase: number;
  deliveryPerKm: number;
  /** Além deste raio a loja não entrega. Nulo = sem limite. */
  deliveryMaxKm: number | null;
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
/*
 * Ícones oferecidos ao dono da loja na hora de criar uma categoria.
 *
 * Um mapa fixo, e não `lucide-react` inteiro: importar a biblioteca toda pelo
 * nome traria mais de mil ícones para o pacote do cliente, que hoje pesa 117 KB.
 *
 * A lista cobre nichos além de hamburgueria — pizzaria, japonês, padaria,
 * cafeteria, adega — porque o mesmo sistema é instalado para lojas diferentes.
 */
const icones: Record<string, LucideIcon> = {
  Apple,
  Beef,
  Beer,
  Cake,
  Candy,
  Carrot,
  Cherry: CherryIcon,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  Flame,
  Grape,
  Ham,
  IceCreamCone,
  Leaf,
  Martini,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shell,
  Soup,
  UtensilsCrossed,
  Wheat,
  Wine,
};

export const nomesDeIcone = Object.keys(icones);

export const iconePorNome = (nome: string): LucideIcon =>
  icones[nome] ?? UtensilsCrossed;
