import { formatPrice } from '@/lib/format';
import type { PedidoCriado } from '@/lib/orders';
import { paymentLabels, type CustomerData, type PaymentMethod, type StoreSettings } from '@/types/order';

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
 *
 * Acento não entra nesta lista: o WhatsApp é UTF-8 e sempre transportou nome de
 * produto acentuado sem problema. Quem corrompia a comanda eram os caracteres
 * acima, não o "ã".
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

export interface ItemDaComanda {
  nome: string;
  quantidade: number;
  total: number;
  observacao: string;
  opcoes: Array<{ grupo: string; opcao: string; quantidade: number }>;
}

/**
 * Forma normalizada da comanda.
 *
 * Existe porque duas telas precisam da mesma mensagem a partir de origens
 * diferentes: o checkout monta com o que `create_order` devolveu, e o
 * acompanhamento monta com o que `consultar_pedido` devolve — para reenviar
 * quando o navegador engole a janela do WhatsApp. Uma única função de montagem
 * garante que a cozinha receba o mesmo texto nos dois caminhos.
 */
export interface DadosComanda {
  codigo: string;
  criadoEm?: string | null;
  clienteNome: string;
  entrega: boolean;
  pagamento: PaymentMethod;
  trocoPara?: number | null;
  talheres: boolean;
  endereco?: string | null;
  complemento?: string | null;
  local?: { lat: number; lng: number } | null;
  cupom?: string | null;
  itens: ItemDaComanda[];
  subtotal: number;
  desconto: number;
  taxaEntrega: number;
  entregaGratis?: boolean;
  taxaServico: number;
  total: number;
  distanciaKm?: number | null;
}

const dataHora = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** "3 itens" / "1 item", para a cozinha conferir o que montou. */
const contagem = (itens: ItemDaComanda[]) => {
  const n = itens.reduce((s, i) => s + i.quantidade, 0);
  return `${n} ${n === 1 ? 'item' : 'itens'}`;
};

/**
 * Monta a comanda a partir de valores que o BANCO calculou.
 *
 * Nenhum número aqui é recalculado no navegador: totais, descontos e taxas vêm
 * de `create_order`. É isso que impede a comanda de sair com um valor que o
 * cliente escolheu.
 */
export const montarComanda = (d: DadosComanda, settings: StoreSettings): string => {
  const itens = d.itens
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

  const quando = dataHora(d.criadoEm);

  let m = `*NOVO PEDIDO ${d.codigo}*\n`;
  if (quando) m += `${quando}\n`;
  m += '\n';
  m += `*Cliente:* ${d.clienteNome}\n`;
  m += `*Tipo:* ${d.entrega ? 'ENTREGA' : 'RETIRADA'}\n\n`;

  m += `${SEPARADOR}\n*ITENS* (${contagem(d.itens)})\n\n${itens}\n\n`;

  m += `${SEPARADOR}\n`;
  m += `Subtotal: ${formatPrice(d.subtotal)}\n`;

  if (d.desconto > 0) {
    const cupom = d.cupom ? ` (${d.cupom})` : '';
    m += `Desconto${cupom}: -${formatPrice(d.desconto)}\n`;
  }
  if (d.entrega) {
    const dist = d.distanciaKm ? ` (${d.distanciaKm} km)` : '';
    m += d.entregaGratis
      ? `Taxa de entrega: GRÁTIS (cupom)${dist}\n`
      : `Taxa de entrega: ${formatPrice(d.taxaEntrega)}${dist}\n`;
  }
  if (d.taxaServico > 0) {
    m += `Taxa de serviço: ${formatPrice(d.taxaServico)}\n`;
  }

  m += `*TOTAL: ${formatPrice(d.total)}*\n\n`;
  m += `*Pagamento:* ${paymentLabels[d.pagamento]}\n`;

  if (d.pagamento === 'cash' && d.trocoPara) {
    const troco = d.trocoPara - d.total;
    m += `*Troco para:* ${formatPrice(d.trocoPara)}`;
    m += troco > 0 ? ` - levar ${formatPrice(troco)}\n` : '\n';
  }
  if (d.pagamento === 'pix' && settings.pixKey) {
    m += `*Chave Pix:* ${settings.pixKey}\n`;
  }

  m += `Talheres: ${d.talheres ? 'SIM' : 'NÃO'}\n`;

  if (d.entrega) {
    m += `\n${SEPARADOR}\n*ENDEREÇO DE ENTREGA*\n`;
    m += `${d.endereco ?? '(não informado)'}\n`;
    if (d.complemento) m += `Complemento: ${d.complemento}\n`;
    if (d.local) {
      m += `\n*Localização no Maps:*\n${mapsUrl(d.local)}\n`;
    }
  } else if (settings.address) {
    // Na retirada o endereço que importa é o da LOJA: a comanda serve também
    // de comprovante para quem não olhou o cardápio.
    m += `\n${SEPARADOR}\n*RETIRAR EM*\n${settings.address}\n`;
    if (settings.lat !== null && settings.lng !== null) {
      m += `${mapsUrl({ lat: settings.lat, lng: settings.lng })}\n`;
    }
  }

  m += `\n${SEPARADOR}\nAguardando a confirmação do pedido!`;

  return limparParaWhatsApp(m);
};

/** Adapta o retorno de `create_order` — o caminho do checkout. */
export const comandaDoPedido = ({
  pedido,
  customer,
  cutlery,
  couponCode,
}: {
  pedido: PedidoCriado;
  customer: CustomerData;
  cutlery: boolean;
  couponCode?: string | null;
}): DadosComanda => ({
  codigo: pedido.codigo,
  criadoEm: new Date().toISOString(),
  clienteNome: customer.name,
  entrega: customer.deliveryType === 'delivery',
  pagamento: customer.paymentMethod,
  trocoPara: pedido.troco_para,
  talheres: cutlery,
  endereco: customer.address,
  complemento: customer.complement,
  local: customer.location ?? null,
  cupom: couponCode ?? null,
  itens: pedido.itens,
  subtotal: pedido.subtotal,
  desconto: pedido.desconto,
  taxaEntrega: pedido.taxa_entrega,
  entregaGratis: pedido.entrega_gratis,
  taxaServico: pedido.taxa_servico,
  total: pedido.total,
  distanciaKm: pedido.distancia_km,
});

export const whatsappUrl = (numero: StoreSettings['whatsapp'], mensagem: string) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
