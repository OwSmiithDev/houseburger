const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata um valor em reais. Instância do Intl é criada uma vez só. */
export const formatPrice = (price: number) => brl.format(price);
