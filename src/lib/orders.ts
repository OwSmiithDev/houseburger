import { api } from '@/lib/api';
import type { LinhaResolvida } from '@/lib/pricing';
import type { CustomerData } from '@/types/order';

/**
 * Pedido conforme o BANCO calculou.
 *
 * Os campos aqui são os únicos que valem. O resumo mostrado na tela é uma
 * previsão feita no navegador; se por qualquer motivo divergir, o que vai para
 * a cozinha é este retorno.
 */
export interface PedidoCriado {
  id: string;
  codigo: string;
  itens: Array<{
    nome: string;
    quantidade: number;
    preco_unit: number;
    total: number;
    observacao: string;
    opcoes: Array<{
      grupo: string;
      opcao: string;
      quantidade: number;
      price_delta: number;
    }>;
  }>;
  subtotal: number;
  desconto: number;
  taxa_entrega: number;
  entrega_gratis: boolean;
  taxa_servico: number;
  gorjeta: number;
  total: number;
  troco_para: number | null;
}

/**
 * Envia o pedido pela função `create_order`.
 *
 * Repare no que NÃO é enviado: nenhum preço, nenhum subtotal, nenhum total.
 * Só identificadores e quantidades. O banco recalcula tudo a partir das
 * tabelas, o que torna irrelevante qualquer adulteração do lado do cliente.
 *
 * A gorjeta é a única exceção, porque é escolha livre do cliente — e mesmo ela
 * entra limitada do outro lado.
 */
export const criarPedido = async ({
  linhas,
  customer,
  cutlery,
  couponCode,
  gorjeta,
}: {
  linhas: LinhaResolvida[];
  customer: CustomerData;
  cutlery: boolean;
  couponCode: string | null;
  gorjeta: number;
}): Promise<PedidoCriado> => {
  const payload = {
    cliente_nome: customer.name.trim(),
    tipo_entrega: customer.deliveryType,
    pagamento: customer.paymentMethod,
    troco_para: customer.paymentMethod === 'cash' ? customer.changeFor ?? null : null,
    endereco: customer.address ?? '',
    complemento: customer.complement ?? '',
    lat: customer.location?.lat ?? null,
    lng: customer.location?.lng ?? null,
    talheres: cutlery,
    cupom_codigo: couponCode ?? '',
    gorjeta,
    itens: linhas.map(({ line, escolhas }) => ({
      // O id que o banco conhece é o uuid; o catálogo expõe o slug.
      product_slug: line.productId,
      quantidade: line.quantity,
      observacao: line.notes,
      opcoes: escolhas.map(({ group, option, quantity }) => ({
        group_slug: group.id,
        option_slug: option.id,
        quantidade: quantity,
      })),
    })),
  };

  const { data, error } = await api.rpc('create_order', { payload });

  if (error) {
    // A função usa `raise exception` com texto em português para os casos
    // previstos (loja fechada, mínimo, grupo faltando), então a mensagem serve
    // direto ao usuário.
    throw new Error(error.message);
  }

  return data as PedidoCriado;
};
