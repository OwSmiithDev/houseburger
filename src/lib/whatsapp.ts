import { formatPrice } from '@/lib/format';
import type { PedidoCriado } from '@/lib/orders';
import { paymentLabels, type CustomerData, type StoreSettings } from '@/types/order';

/**
 * Separador em ASCII puro. Traços de desenho de caixa (U+2501 e afins) não
 * existem em muitas fontes de sistema e chegam à cozinha como fileiras de "?".
 */
const SEPARADOR = '--------------------';

/**
 * Última barreira antes de a comanda sair do aplicativo.
 *
 * A mensagem é texto simples lido em telefones e desktops variados, muitos com
 * fontes incompletas. Aqui caem os caracteres que parecem inofensivos no editor
 * mas chegam corrompidos do outro lado:
 *
 * - U+00A0 e U+202F: espaços inseparáveis que o Intl insere nos preços;
 * - U+FE0F: seletor de variação de emoji, que vira quadrado sozinho;
 * - U+200B, U+200E, U+200F e U+FEFF: marcas invisíveis que entram por colagem
 *   no nome ou no endereço.
 */
export const limparParaWhatsApp = (texto: string) =>
  texto
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/[\uFE0F\u200B\u200E\u200F\uFEFF]/g, '')
    .replace(/[ \t]+\n/g, '\n');

/**
 * Formato documentado pelo Google (Maps URLs, api=1). A forma antiga
 * (maps?q=lat,lng) é legada e depende de redirecionamento, o que atrapalha a
 * abertura no aplicativo nativo do celular.
 *
 * Seis casas decimais equivalem a cerca de 11 cm — mais que suficiente para uma
 * entrega, e evita arrastar o ruído do ponto flutuante para a URL.
 */
export const mapsUrl = ({ lat, lng }: { lat: number; lng: number }) =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;

/**
 * Monta a comanda a partir do pedido que o BANCO devolveu.
 *
 * Nenhum valor aqui é recalculado no navegador: totais, descontos e taxas vêm
 * de `create_order`. É isso que impede a comanda de sair com um número que o
 * cliente escolheu.
 */
export const montarComanda = ({
  pedido,
  customer,
  cutlery,
  settings,
}: {
  pedido: PedidoCriado;
  customer: CustomerData;
  cutlery: boolean;
  settings: StoreSettings;
}): string => {
  const entrega = customer.deliveryType === 'delivery';

  const itens = pedido.itens
    .map((item) => {
      const partes = [`- ${item.quantidade}x ${item.nome} - ${formatPrice(item.total)}`];
      for (const o of item.opcoes) {
        const qtd = o.quantidade > 1 ? `${o.quantidade}x ` : '';
        partes.push(`   ${o.grupo}: ${qtd}${o.opcao}`);
      }
      if (item.observacao) partes.push(`   Obs: ${item.observacao}`);
      return partes.join('\n');
    })
    .join('\n');

  let m = `*NOVO PEDIDO ${pedido.codigo}*\n\n`;
  m += `*Cliente:* ${customer.name}\n`;
  m += `*Tipo:* ${entrega ? 'ENTREGA' : 'RETIRADA'}\n\n`;

  m += `${SEPARADOR}\n*ITENS*\n\n${itens}\n\n`;

  m += `${SEPARADOR}\n`;
  m += `Subtotal: ${formatPrice(pedido.subtotal)}\n`;

  if (pedido.desconto > 0) {
    m += `Desconto: -${formatPrice(pedido.desconto)}\n`;
  }
  if (entrega) {
    const dist = pedido.distancia_km ? ` (${pedido.distancia_km} km)` : '';
    m += pedido.entrega_gratis
      ? `Taxa de entrega: GRATIS (cupom)${dist}\n`
      : `Taxa de entrega: ${formatPrice(pedido.taxa_entrega)}${dist}\n`;
  }
  if (pedido.taxa_servico > 0) {
    m += `Taxa de servico: ${formatPrice(pedido.taxa_servico)}\n`;
  }
  if (pedido.gorjeta > 0) {
    // Sem pagamento no aplicativo, a gorjeta é uma intenção: precisa ficar
    // explícito para quem entrega que o valor é cobrado junto, em mãos.
    m += `Gorjeta ao entregador: ${formatPrice(pedido.gorjeta)} (a receber na entrega)\n`;
  }
  m += `*TOTAL: ${formatPrice(pedido.total)}*\n`;
  m += `*Pagamento:* ${semAcento(paymentLabels[customer.paymentMethod])}\n`;

  if (customer.paymentMethod === 'cash' && pedido.troco_para) {
    const troco = pedido.troco_para - pedido.total;
    m += `*Troco para:* ${formatPrice(pedido.troco_para)}`;
    m += troco > 0 ? ` (levar ${formatPrice(troco)})\n` : `\n`;
  }

  m += `Talheres: ${cutlery ? 'SIM' : 'NAO'}\n`;

  if (entrega) {
    m += `\n${SEPARADOR}\n*ENDERECO DE ENTREGA*\n`;
    m += `${customer.address}\n`;
    if (customer.complement) m += `Complemento: ${customer.complement}\n`;
    if (customer.location) {
      m += `\n*Localizacao no Maps:*\n${mapsUrl(customer.location)}\n`;
    }
  } else if (settings.address) {
    // Na retirada o endereco que importa e o da LOJA: a comanda serve
    // tambem de comprovante para quem nao olhou o cardapio.
    m += `\n${SEPARADOR}\n*RETIRAR EM*\n${semAcento(settings.address)}\n`;
    if (settings.lat !== null && settings.lng !== null) {
      m += `${mapsUrl({ lat: settings.lat, lng: settings.lng })}\n`;
    }
  }

  m += `\n${SEPARADOR}\nAguardando confirmacao do pedido!`;

  return limparParaWhatsApp(m);
};

/** Rótulos da interface têm acento; na comanda tiramos por segurança de fonte. */
const semAcento = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const whatsappUrl = (numero: StoreSettings['whatsapp'], mensagem: string) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
