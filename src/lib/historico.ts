/**
 * Histórico de pedidos do cliente, guardado só no aparelho.
 *
 * O aplicativo do cliente não tem login, então não existe "meus pedidos" no
 * servidor: quem guarda a lista é o próprio navegador. O banco continua com o
 * registro completo de tudo — é de lá que o painel sabe quem pediu o quê.
 *
 * O que fica aqui é o mínimo para montar a lista e reabrir o acompanhamento:
 * o token, o código, a data, o total e o tipo de entrega. **Nome, endereço e
 * coordenadas não entram**, mantendo a promessa de que os dados do checkout
 * vivem só em memória. Quem precisar deles busca no servidor apresentando o
 * token, que é justamente o que a tela de acompanhamento faz.
 */

const CHAVE = 'houseburger:pedidos';

/** Chave antiga, de quando só o último pedido era lembrado. */
const CHAVE_ANTIGA = 'houseburger:ultimo-pedido';

/** Acima disso a lista vira arquivo morto e só ocupa espaço. */
const LIMITE = 30;

/** Passado isso o pedido já foi entregue ou esquecido faz tempo. */
const VALIDADE_MS = 90 * 24 * 60 * 60 * 1000;

export interface PedidoNoHistorico {
  token: string;
  codigo: string;
  /** ISO 8601, gravado no momento do envio. */
  criadoEm: string;
  total: number;
  tipoEntrega: 'pickup' | 'delivery';
  itens: number;
  /**
   * Entregue ou cancelado. Marcado pela tela de acompanhamento quando vê o
   * status final — o pedido continua na lista, mas para de disputar a faixa
   * de "em andamento" no topo do cardápio.
   */
  finalizado?: boolean;
}

const ehPedido = (v: unknown): v is PedidoNoHistorico => {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.token === 'string' &&
    p.token.length > 0 &&
    typeof p.codigo === 'string' &&
    typeof p.criadoEm === 'string' &&
    typeof p.total === 'number' &&
    (p.tipoEntrega === 'pickup' || p.tipoEntrega === 'delivery')
  );
};

/**
 * Lê a lista, do mais recente para o mais antigo.
 *
 * Tudo que estiver corrompido, vencido ou fora do formato é descartado em
 * silêncio: é conveniência do cliente, não fonte de verdade, e quebrar a tela
 * por causa de uma entrada estragada seria pior do que perder a entrada.
 */
export const lerHistorico = (): PedidoNoHistorico[] => {
  let bruto: string | null = null;
  try {
    bruto = window.localStorage.getItem(CHAVE);
  } catch {
    return [];
  }

  let lista: PedidoNoHistorico[] = [];
  if (bruto) {
    try {
      const dados: unknown = JSON.parse(bruto);
      if (Array.isArray(dados)) lista = dados.filter(ehPedido);
    } catch {
      lista = [];
    }
  }

  // Migração da chave antiga: quem já tinha um pedido em andamento não pode
  // perdê-lo só porque o formato mudou. Sem código nem total, que não eram
  // guardados na época — a tela preenche o que faltar ao consultar o servidor.
  try {
    const antigo = window.localStorage.getItem(CHAVE_ANTIGA);
    if (antigo && !lista.some((p) => p.token === antigo)) {
      lista.push({
        token: antigo,
        codigo: '',
        criadoEm: new Date().toISOString(),
        total: 0,
        tipoEntrega: 'delivery',
        itens: 0,
      });
    }
    if (antigo) window.localStorage.removeItem(CHAVE_ANTIGA);
  } catch {
    /* segue sem a migração */
  }

  const limite = Date.now() - VALIDADE_MS;
  return lista
    .filter((p) => {
      const t = Date.parse(p.criadoEm);
      return Number.isNaN(t) || t >= limite;
    })
    .sort((a, b) => Date.parse(b.criadoEm) - Date.parse(a.criadoEm))
    .slice(0, LIMITE);
};

const gravar = (lista: PedidoNoHistorico[]) => {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, LIMITE)));
  } catch {
    /* modo privado ou cota cheia: a sessão atual continua funcionando */
  }
};

/** Registra um pedido recém-enviado no topo da lista. */
export const lembrarPedido = (pedido: PedidoNoHistorico) => {
  const lista = lerHistorico().filter((p) => p.token !== pedido.token);
  gravar([pedido, ...lista]);
};

/**
 * Completa o que faltava numa entrada, a partir do que o servidor devolveu.
 *
 * Serve à migração da chave antiga e ao caso de o cliente abrir um link de
 * acompanhamento em outro aparelho: a lista local passa a conhecer o pedido.
 */
export const registrarConsulta = (
  token: string,
  dados: Omit<PedidoNoHistorico, 'token'>,
) => {
  const lista = lerHistorico();
  const atual = lista.find((p) => p.token === token);
  // Grava só quando algo mudou de fato: esta função roda a cada consulta, e
  // reescrever o armazenamento a cada 12 segundos não traria ganho nenhum.
  if (
    atual &&
    atual.codigo === dados.codigo &&
    atual.total === dados.total &&
    Boolean(atual.finalizado) === Boolean(dados.finalizado)
  ) {
    return;
  }
  gravar([{ token, ...dados }, ...lista.filter((p) => p.token !== token)]);
};

export const esquecerPedido = (token: string) => {
  gravar(lerHistorico().filter((p) => p.token !== token));
};

export const limparHistorico = () => {
  try {
    window.localStorage.removeItem(CHAVE);
    window.localStorage.removeItem(CHAVE_ANTIGA);
  } catch {
    /* nada a fazer */
  }
};

/**
 * O pedido que ainda merece uma faixa no topo do cardápio.
 *
 * Só o mais recente, e só nas primeiras horas: uma faixa que fica para sempre
 * vira ruído e a pessoa para de enxergá-la.
 */
export const pedidoEmAndamento = (): PedidoNoHistorico | null => {
  const [ultimo] = lerHistorico().filter((p) => !p.finalizado);
  if (!ultimo) return null;
  const idade = Date.now() - Date.parse(ultimo.criadoEm);
  if (Number.isNaN(idade) || idade > 6 * 60 * 60 * 1000) return null;
  return ultimo;
};
