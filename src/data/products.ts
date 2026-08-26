import { OptionGroup, Product } from '@/types/order';

/*
 * Grupos reaproveitados entre produtos. Os acréscimos são exemplos — ajuste
 * para o cardápio real do House Burger antes de colocar no ar.
 */

const grupoPao: OptionGroup = {
  id: 'pao',
  name: 'Escolha o pão',
  min: 1,
  max: 1,
  options: [
    { id: 'brioche', name: 'Brioche', priceDelta: 0 },
    { id: 'gergelim', name: 'Gergelim', priceDelta: 0 },
    { id: 'australiano', name: 'Australiano', priceDelta: 3 },
    { id: 'sem-gluten', name: 'Sem glúten', priceDelta: 5 },
  ],
};

const grupoPonto: OptionGroup = {
  id: 'ponto',
  name: 'Ponto da carne',
  min: 1,
  max: 1,
  options: [
    { id: 'mal', name: 'Mal passada', priceDelta: 0 },
    { id: 'ponto', name: 'Ao ponto', priceDelta: 0 },
    { id: 'bem', name: 'Bem passada', priceDelta: 0 },
  ],
};

const grupoAdicionais: OptionGroup = {
  id: 'adicionais',
  name: 'Adicionais',
  min: 0,
  max: 6,
  options: [
    { id: 'bacon', name: 'Bacon em tiras', priceDelta: 5 },
    { id: 'cheddar', name: 'Cheddar extra', priceDelta: 4 },
    { id: 'burger-extra', name: 'Hambúrguer extra 150g', priceDelta: 9 },
    { id: 'cebola-caramelizada', name: 'Cebola caramelizada', priceDelta: 3.5 },
    { id: 'ovo', name: 'Ovo frito', priceDelta: 3 },
    { id: 'picles', name: 'Picles', priceDelta: 2 },
  ],
};

const grupoRemover: OptionGroup = {
  id: 'remover',
  name: 'Remover ingredientes',
  min: 0,
  max: 5,
  options: [
    { id: 'sem-cebola', name: 'Sem cebola', priceDelta: 0 },
    { id: 'sem-tomate', name: 'Sem tomate', priceDelta: 0 },
    { id: 'sem-alface', name: 'Sem alface', priceDelta: 0 },
    { id: 'sem-picles', name: 'Sem picles', priceDelta: 0 },
    { id: 'sem-molho', name: 'Sem molho especial', priceDelta: 0 },
  ],
};

const grupoBebidaCombo: OptionGroup = {
  id: 'bebida',
  name: 'Escolha sua bebida',
  min: 1,
  max: 1,
  options: [
    { id: 'coca', name: 'Coca-Cola lata', priceDelta: 0 },
    { id: 'coca-zero', name: 'Coca-Cola Zero lata', priceDelta: 0 },
    { id: 'guarana', name: 'Guaraná lata', priceDelta: 0 },
    { id: 'suco-laranja', name: 'Suco de laranja 300ml', priceDelta: 3 },
  ],
};

const grupoAcompanhamento: OptionGroup = {
  id: 'acompanhamento',
  name: 'Escolha o acompanhamento',
  min: 1,
  max: 1,
  options: [
    { id: 'batata-p', name: 'Batata frita pequena', priceDelta: 0 },
    { id: 'batata-m', name: 'Batata frita média', priceDelta: 4 },
    { id: 'batata-cheddar', name: 'Batata com cheddar e bacon', priceDelta: 9 },
    { id: 'onion', name: 'Onion rings', priceDelta: 7 },
  ],
};

const grupoTamanhoBebida: OptionGroup = {
  id: 'tamanho',
  name: 'Tamanho',
  min: 1,
  max: 1,
  options: [
    { id: 'lata', name: 'Lata 350ml', priceDelta: 0 },
    { id: 'garrafa-600', name: 'Garrafa 600ml', priceDelta: 3 },
    { id: 'litro', name: '1 litro', priceDelta: 5 },
  ],
};

export const products: Product[] = [
  // Promoções do dia
  {
    id: 'promo-1',
    name: 'Combo Super Economia',
    description: 'X-Bacon + batata média + refrigerante lata',
    price: 29.9,
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    category: 'promos',
    featured: true,
    groups: [grupoPao, grupoPonto, grupoBebidaCombo, grupoAdicionais],
  },
  {
    id: 'promo-2',
    name: 'Dupla Feliz',
    description: 'Dois X-Salada por um preço especial',
    price: 34.9,
    image:
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop',
    category: 'promos',
    featured: true,
    groups: [grupoPao, grupoPonto, grupoRemover],
  },

  // Hambúrgueres
  {
    id: 'burger-1',
    name: 'X-Bacon Especial',
    description:
      'Pão brioche, blend 180g, bacon crocante, queijo cheddar, alface e tomate',
    price: 28.9,
    image:
      'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop',
    category: 'burgers',
    featured: true,
    groups: [grupoPao, grupoPonto, grupoAdicionais, grupoRemover],
  },
  {
    id: 'burger-2',
    name: 'X-Salada Classic',
    description:
      'Pão de gergelim, blend 150g, queijo, alface, tomate e maionese da casa',
    price: 22.9,
    image:
      'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
    category: 'burgers',
    groups: [grupoPao, grupoPonto, grupoAdicionais, grupoRemover],
  },
  {
    id: 'burger-3',
    name: 'Duplo Cheddar',
    description:
      'Dois blends de 150g, cheddar duplo, cebola caramelizada e molho especial',
    price: 36.9,
    image:
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop',
    category: 'burgers',
    featured: true,
    groups: [grupoPao, grupoPonto, grupoAdicionais, grupoRemover],
  },
  {
    id: 'burger-4',
    name: 'Veggie Burger',
    description: 'Hambúrguer de grão-de-bico, queijo, rúcula e tomate seco',
    price: 26.9,
    image:
      'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&h=300&fit=crop',
    category: 'burgers',
    groups: [grupoPao, grupoRemover],
  },

  // Batatas
  {
    id: 'fries-1',
    name: 'Batata Frita Pequena',
    description: 'Porção individual de batatas sequinhas',
    price: 9.9,
    image:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
    category: 'fries',
  },
  {
    id: 'fries-2',
    name: 'Batata Frita Média',
    description: 'Porção média de batatas fritas sequinhas',
    price: 12.9,
    image:
      'https://s2-g1.glbimg.com/CKfwlPmqh90d1QnEy2V1Ev8QFOA=/0x0:520x370/984x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_59edd422c0c84a879bd37670ae4f538a/internal_photos/bs/2022/L/M/BAjY2OQK6OwH9uCXKqiQ/batata-frita-canva.jpg',
    category: 'fries',
  },
  {
    id: 'fries-3',
    name: 'Batata com Cheddar e Bacon',
    description: 'Batata frita coberta com cheddar cremoso e bacon crocante',
    price: 19.9,
    image:
      'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=400&h=300&fit=crop',
    category: 'fries',
    featured: true,
  },
  {
    id: 'fries-4',
    name: 'Onion Rings',
    description: 'Anéis de cebola empanados e crocantes',
    price: 16.9,
    image:
      'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop',
    category: 'fries',
  },

  // Combos
  {
    id: 'combo-1',
    name: 'Combo X-Bacon',
    description: 'X-Bacon com acompanhamento e bebida à sua escolha',
    price: 39.9,
    image:
      'https://images.unsplash.com/photo-1610614819513-58e34989848b?w=400&h=300&fit=crop',
    category: 'combos',
    groups: [
      grupoPao,
      grupoPonto,
      grupoAcompanhamento,
      grupoBebidaCombo,
      grupoAdicionais,
    ],
  },
  {
    id: 'combo-2',
    name: 'Combo Duplo',
    description: 'Duplo Cheddar com acompanhamento e bebida à sua escolha',
    price: 47.9,
    image:
      'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop',
    category: 'combos',
    featured: true,
    groups: [
      grupoPao,
      grupoPonto,
      grupoAcompanhamento,
      grupoBebidaCombo,
      grupoAdicionais,
    ],
  },
  {
    id: 'combo-3',
    name: 'Combo Família',
    description: 'Quatro hambúrgueres, duas batatas grandes e refrigerante de 2 litros',
    price: 119.9,
    image:
      'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop',
    category: 'combos',
    groups: [grupoPonto, grupoAdicionais],
  },

  // Refrigerantes
  {
    id: 'soda-1',
    name: 'Coca-Cola',
    description: 'Refrigerante gelado',
    price: 6.9,
    image:
      'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop',
    category: 'sodas',
    groups: [grupoTamanhoBebida],
  },
  {
    id: 'soda-2',
    name: 'Guaraná Antarctica',
    description: 'Refrigerante gelado',
    price: 6.5,
    image:
      'https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?w=400&h=300&fit=crop',
    category: 'sodas',
    groups: [grupoTamanhoBebida],
  },
  {
    id: 'soda-3',
    name: 'Sprite',
    description: 'Refrigerante gelado',
    price: 6.5,
    image:
      'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=300&fit=crop',
    category: 'sodas',
    groups: [grupoTamanhoBebida],
  },

  // Sucos
  {
    id: 'juice-1',
    name: 'Suco de Laranja',
    description: 'Natural, feito na hora, 500ml',
    price: 11.9,
    image:
      'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop',
    category: 'juices',
  },
  {
    id: 'juice-2',
    name: 'Suco de Morango',
    description: 'Natural, 500ml',
    price: 13.9,
    image:
      'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop',
    category: 'juices',
  },
  {
    id: 'juice-3',
    name: 'Limonada Suíça',
    description: 'Limão batido com leite condensado, 500ml',
    price: 12.9,
    image:
      'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop',
    category: 'juices',
  },

  // Cremes
  {
    id: 'cream-1',
    name: 'Milkshake de Chocolate',
    description: 'Sorvete batido com calda de chocolate, 400ml',
    price: 17.9,
    image:
      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',
    category: 'creams',
    featured: true,
  },
  {
    id: 'cream-2',
    name: 'Milkshake de Morango',
    description: 'Sorvete batido com morango, 400ml',
    price: 17.9,
    image:
      'https://images.unsplash.com/photo-1586917049352-bd32c1edd8e6?w=400&h=300&fit=crop',
    category: 'creams',
  },
  {
    id: 'cream-3',
    name: 'Petit Gateau',
    description: 'Bolo quente de chocolate com sorvete de creme',
    price: 21.9,
    image:
      'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop',
    category: 'creams',
  },
];

export const findProduct = (id: string): Product | undefined =>
  products.find((product) => product.id === id);
