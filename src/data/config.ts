/**
 * Parâmetros comerciais da loja.
 *
 * ATENÇÃO: os valores abaixo são exemplos. Ajuste para a realidade do
 * House Burger antes de colocar no ar — eles aparecem na tela do cliente e
 * na comanda enviada à cozinha.
 */

export const LOJA = {
  nome: 'House Burger',
  /** Formato internacional, só dígitos. */
  whatsapp: '5562999718912',
  avaliacao: 4.8,
  avaliacoes: '200+',
  /** Faixa de tempo exibida ao cliente, em minutos. */
  tempoMin: 25,
  tempoMax: 40,
  banner:
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=400&fit=crop',
} as const;

/** Taxa fixa de entrega. Não é calculada por distância. */
export const TAXA_ENTREGA = 8.9;

/** Taxa de serviço sobre o subtotal. Zero desliga a linha no resumo. */
export const TAXA_SERVICO = 0;

/** Valor mínimo do subtotal para fechar o pedido. */
export const PEDIDO_MINIMO = 25;

/** Sugestões de gorjeta ao entregador, em reais. */
export const GORJETAS = [2, 3, 5];

/** Limites que também valem para o carrinho restaurado do armazenamento. */
export const MAX_QUANTIDADE_LINHA = 99;
export const MAX_OBSERVACAO = 140;
