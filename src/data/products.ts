import { Product } from '@/types/order';

export const products: Product[] = [
  // Promoções do Dia
  {
    id: 'promo-1',
    name: 'Combo Super Economia',
    description: 'X-Bacon + Batata Média + Refri 400ml',
    price: 29.90,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    category: 'promos',
  },
  {
    id: 'promo-2',
    name: 'Dupla Feliz',
    description: '2 X-Salada por um preço especial',
    price: 34.90,
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop',
    category: 'promos',
  },

  // Hambúrgueres
  {
    id: 'burger-1',
    name: 'X-Bacon Especial',
    description: 'Pão brioche, blend 180g, bacon crocante, queijo cheddar, alface e tomate',
    price: 28.90,
    image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop',
    category: 'burgers',
  },
  {
    id: 'burger-2',
    name: 'X-Salada Classic',
    description: 'Pão gergelim, blend 150g, queijo, alface, tomate e maionese especial',
    price: 22.90,
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
    category: 'burgers',
  },
  {
    id: 'burger-3',
    name: 'Double Cheese',
    description: 'Pão australiano, 2 blends 120g, duplo cheddar e molho secreto',
    price: 32.90,
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop',
    category: 'burgers',
  },
  {
    id: 'burger-4',
    name: 'Frango Crispy',
    description: 'Filé de frango empanado, queijo, bacon e molho ranch',
    price: 26.90,
    image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop',
    category: 'burgers',
  },

  // Batatas
  {
    id: 'fries-1',
    name: 'Batata Frita P',
    description: 'Porção pequena de batatas fritas sequinhas',
    price: 8.90,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
    category: 'fries',
  },
  {
    id: 'fries-2',
    name: 'Batata Frita M',
    description: 'Porção média de batatas fritas sequinhas',
    price: 12.90,
    image: 'https://s2-g1.glbimg.com/CKfwlPmqh90d1QnEy2V1Ev8QFOA=/0x0:520x370/984x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_59edd422c0c84a879bd37670ae4f538a/internal_photos/bs/2022/L/M/BAjY2OQK6OwH9uCXKqiQ/batata-frita-canva.jpg',
    category: 'fries',
  },
  {
    id: 'fries-3',
    name: 'Batata Frita G',
    description: 'Porção grande de batatas fritas sequinhas',
    price: 16.90,
    image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=400&h=300&fit=crop',
    category: 'fries',
  },
  {
    id: 'fries-4',
    name: 'Batata com Cheddar',
    description: 'Batata frita coberta com cheddar cremoso e bacon',
    price: 19.90,
    image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=400&h=300&fit=crop',
    category: 'fries',
  },

  // Combos
  {
    id: 'combo-1',
    name: 'Combo X-Bacon',
    description: 'X-Bacon + Batata M + Refri 500ml',
    price: 39.90,
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&h=300&fit=crop',
    category: 'combos',
  },
  {
    id: 'combo-2',
    name: 'Combo Double',
    description: 'Double Cheese + Batata G + Refri 500ml',
    price: 45.90,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop',
    category: 'combos',
  },
  {
    id: 'combo-3',
    name: 'Combo Família',
    description: '2 X-Bacon + 2 Batatas M + 4 Refris 300ml',
    price: 79.90,
    image: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=400&h=300&fit=crop',
    category: 'combos',
  },

  // Refrigerantes
  {
    id: 'soda-1',
    name: 'Coca-Cola 300ml',
    description: 'Refrigerante Coca-Cola gelado',
    price: 6.90,
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop',
    category: 'sodas',
  },
  {
    id: 'soda-2',
    name: 'Coca-Cola 500ml',
    description: 'Refrigerante Coca-Cola gelado',
    price: 8.90,
    image: 'https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?w=400&h=300&fit=crop',
    category: 'sodas',
  },
  {
    id: 'soda-3',
    name: 'Guaraná 300ml',
    description: 'Refrigerante Guaraná Antarctica gelado',
    price: 5.90,
    image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=300&fit=crop',
    category: 'sodas',
  },

  // Sucos
  {
    id: 'juice-1',
    name: 'Suco de Laranja 400ml',
    description: 'Suco natural de laranja',
    price: 9.90,
    image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop',
    category: 'juices',
  },
  {
    id: 'juice-2',
    name: 'Suco de Uva 400ml',
    description: 'Suco integral de uva',
    price: 8.90,
    image: 'https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?w=400&h=300&fit=crop',
    category: 'juices',
  },
  {
    id: 'juice-3',
    name: 'Limonada Suíça 400ml',
    description: 'Limonada cremosa com leite condensado',
    price: 10.90,
    image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop',
    category: 'juices',
  },

  // Cremes
  {
    id: 'cream-1',
    name: 'Sundae Chocolate',
    description: 'Sorvete de baunilha com calda de chocolate',
    price: 11.90,
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',
    category: 'creams',
  },
  {
    id: 'cream-2',
    name: 'Sundae Morango',
    description: 'Sorvete de baunilha com calda de morango',
    price: 11.90,
    image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&h=300&fit=crop',
    category: 'creams',
  },
  {
    id: 'cream-3',
    name: 'Milk Shake 400ml',
    description: 'Escolha: Chocolate, Morango ou Ovomaltine',
    price: 14.90,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',
    category: 'creams',
  },
];
