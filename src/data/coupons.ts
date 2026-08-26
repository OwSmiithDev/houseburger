/**
 * Cupons aceitos.
 *
 * A validação acontece no navegador, então isto NÃO é uma defesa: quem quiser
 * consegue aplicar um cupom pelo DevTools. Como o pedido passa pelo WhatsApp e
 * a loja confirma na mão, um desconto indevido aparece na comanda antes de
 * virar prejuízo. O carrinho guarda apenas o código; o valor é recalculado
 * daqui a cada carga, nunca lido do armazenamento.
 */
export interface Coupon {
  code: string;
  description: string;
  /**
   * percent  -> fracao do subtotal (0.1 = 10%)
   * fixed    -> valor em reais
   * shipping -> zera a taxa de entrega; `value` e ignorado
   */
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  /** Subtotal mínimo para o cupom valer. */
  minSubtotal: number;
}

export const coupons: Coupon[] = [
  {
    code: 'PRIMEIRA10',
    description: '10% de desconto na primeira compra',
    type: 'percent',
    value: 0.1,
    minSubtotal: 30,
  },
  {
    code: 'BURGER5',
    description: 'R$ 5,00 de desconto',
    type: 'fixed',
    value: 5,
    minSubtotal: 40,
  },
  {
    code: 'FRETEGRATIS',
    description: 'Entrega grátis',
    type: 'shipping',
    value: 0,
    minSubtotal: 60,
  },
];

export const findCoupon = (code: string): Coupon | undefined =>
  coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
