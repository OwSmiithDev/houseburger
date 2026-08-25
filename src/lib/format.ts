const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * O Intl separa "R$" do valor com U+00A0 (espaço inseparável) — e, em versões
 * mais novas do ICU, com U+202F (espaço estreito inseparável). Os dois são
 * invisíveis na tela, mas viram "?" ou quadrado em clientes de WhatsApp cuja
 * fonte não os cobre, sujando toda linha de preço da comanda.
 *
 * Trocar por espaço comum não muda nada visualmente e mantém o texto seguro
 * para sair do aplicativo.
 */
const ESPACOS_INSEPARAVEIS = /[\u00A0\u202F]/g;

/** Formata um valor em reais. Instância do Intl é criada uma vez só. */
export const formatPrice = (price: number) =>
  brl.format(price).replace(ESPACOS_INSEPARAVEIS, ' ');
