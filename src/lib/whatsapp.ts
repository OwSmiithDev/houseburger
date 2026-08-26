import { LOJA } from '@/data/config';
import { formatPrice } from '@/lib/format';
import type { LinhaResolvida, ResumoPedido } from '@/lib/pricing';
import type { CustomerData } from '@/types/order';

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

const rotuloPagamento = {
  pix: 'PIX',
  card: 'Cartao na entrega',
  cash: 'Dinheiro',
} as const;

export const montarComanda = ({
  linhas,
  resumo,
  customer,
  cutlery,
}: {
  linhas: LinhaResolvida[];
  resumo: ResumoPedido;
  customer: CustomerData;
  cutlery: boolean;
}): string => {
  const entrega = customer.deliveryType === 'delivery';

  const itens = linhas
    .map(({ line, product, escolhas, total }) => {
      const partes = [`- ${line.quantity}x ${product.name} - ${formatPrice(total)}`];
      for (const { group, option, quantity } of escolhas) {
        const qtd = quantity > 1 ? `${quantity}x ` : '';
        partes.push(`   ${group.name}: ${qtd}${option.name}`);
      }
      if (line.notes) partes.push(`   Obs: ${line.notes}`);
      return partes.join('\n');
    })
    .join('\n');

  let m = `*NOVO PEDIDO*\n\n`;
  m += `*Cliente:* ${customer.name}\n`;
  m += `*Tipo:* ${entrega ? 'ENTREGA' : 'RETIRADA'}\n\n`;

  m += `${SEPARADOR}\n*ITENS*\n\n${itens}\n\n`;

  m += `${SEPARADOR}\n`;
  m += `Subtotal: ${formatPrice(resumo.subtotal)}\n`;

  if (resumo.cupom && resumo.desconto > 0) {
    m += `Desconto (${resumo.cupom.code}): -${formatPrice(resumo.desconto)}\n`;
  }
  if (entrega) {
    m += resumo.entregaGratis
      ? `Taxa de entrega: GRATIS (cupom ${resumo.cupom?.code ?? ''})\n`
      : `Taxa de entrega: ${formatPrice(resumo.taxaEntrega)}\n`;
  }
  if (resumo.taxaServico > 0) {
    m += `Taxa de servico: ${formatPrice(resumo.taxaServico)}\n`;
  }
  if (resumo.gorjeta > 0) {
    // Sem pagamento no aplicativo, a gorjeta é uma intenção: precisa ficar
    // explícito para quem entrega que o valor é cobrado junto, em mãos.
    m += `Gorjeta ao entregador: ${formatPrice(resumo.gorjeta)} (a receber na entrega)\n`;
  }
  m += `*TOTAL: ${formatPrice(resumo.total)}*\n`;
  m += `*Pagamento:* ${rotuloPagamento[customer.paymentMethod]}\n`;

  if (customer.paymentMethod === 'cash' && customer.changeFor) {
    const troco = customer.changeFor - resumo.total;
    m += `*Troco para:* ${formatPrice(customer.changeFor)}`;
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
  }

  m += `\n${SEPARADOR}\nAguardando confirmacao do pedido!`;

  return limparParaWhatsApp(m);
};

export const whatsappUrl = (mensagem: string) =>
  `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(mensagem)}`;
