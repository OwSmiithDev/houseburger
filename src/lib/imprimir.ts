import { formatPrice } from '@/lib/format';
import { paymentLabels, type PaymentMethod } from '@/types/order';

export interface PedidoImpressao {
  codigo: string;
  criado_em: string;
  cliente_nome: string;
  tipo_entrega: 'pickup' | 'delivery';
  pagamento: PaymentMethod;
  troco_para: number | null;
  endereco: string | null;
  complemento: string | null;
  talheres: boolean;
  subtotal: number;
  desconto: number;
  cupom_codigo: string | null;
  taxa_entrega: number;
  taxa_servico: number;
  total: number;
  distancia_km?: number | null;
  order_items: Array<{
    nome: string;
    quantidade: number;
    total: number;
    observacao: string;
    opcoes: Array<{ grupo: string; opcao: string; quantidade: number }>;
  }>;
}

/** Dados da loja que entram no cabeçalho da comanda. */
export interface LojaImpressao {
  nome: string;
  whatsapp?: string | null;
  endereco?: string | null;
}

/** 32 colunas é o que cabe numa bobina de 80mm com fonte monoespaçada de 12px. */
const COLUNAS = 32;

const linha = (c = '-') => c.repeat(COLUNAS);

/** Separador leve entre itens, para o olho não colar um no outro. */
const separadorItem = () => '- '.repeat(COLUNAS / 2).trimEnd();

const centralizar = (texto: string) => {
  if (texto.length >= COLUNAS) return texto;
  return ' '.repeat(Math.floor((COLUNAS - texto.length) / 2)) + texto;
};

/**
 * Nome à esquerda, valor à direita, preenchendo o meio com espaços.
 *
 * Quando não cabem na mesma linha, o valor desce sozinho e alinhado à direita —
 * melhor uma linha a mais do que um total grudado no rótulo.
 */
const parYValor = (esquerda: string, direita: string): string[] => {
  const espaco = COLUNAS - esquerda.length - direita.length;
  if (espaco < 1) return [esquerda, direita.padStart(COLUNAS)];
  return [esquerda + ' '.repeat(espaco) + direita];
};

/**
 * Quebra respeitando palavras, para não cortar nome de produto ao meio.
 *
 * O recuo que vier no começo do texto é preservado — `split` por espaço o
 * engoliria, e as opções escolhidas ficariam alinhadas com o nome do item,
 * indistinguíveis para quem monta o lanche.
 */
const quebrar = (texto: string, largura = COLUNAS, recuo = '') => {
  const inicio = /^ */.exec(texto)?.[0] ?? '';
  const palavras = texto.trim().split(/\s+/);
  const linhas: string[] = [];
  let atual = inicio;
  for (const palavra of palavras) {
    const candidato = atual.trim() ? `${atual} ${palavra}` : atual + palavra;
    if (candidato.length > largura) {
      if (atual.trim()) linhas.push(atual);
      atual = (recuo || inicio) + palavra;
    } else {
      atual = candidato;
    }
  }
  if (atual.trim()) linhas.push(atual);
  return linhas;
};

/**
 * Acentos fora: impressora térmica costuma trocá-los por lixo.
 *
 * Diferente da comanda do WhatsApp, que é UTF-8 e transporta acento sem
 * problema — aqui o destino é um equipamento com tabela de caracteres limitada.
 */
const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const escapar = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Monta o corpo da comanda em texto puro, largura fixa. */
export const textoComanda = (p: PedidoImpressao, loja: LojaImpressao): string => {
  const out: string[] = [];
  const entrega = p.tipo_entrega === 'delivery';
  const pecas = p.order_items.reduce((s, i) => s + i.quantidade, 0);

  // ------------------------------------------------------------- cabeçalho
  out.push(linha('='));
  out.push(centralizar(semAcento(loja.nome).toUpperCase()));
  if (loja.whatsapp) out.push(centralizar(`WhatsApp: ${loja.whatsapp}`));
  out.push(linha('='));
  out.push(centralizar(`PEDIDO ${p.codigo}`));
  out.push(centralizar(dataHora(p.criado_em)));
  out.push(linha('='));

  // O tipo de entrega decide o que fazer com o pedido pronto, então vem antes
  // de tudo e centralizado, difícil de passar batido.
  out.push(centralizar(entrega ? '** ENTREGA **' : '** RETIRADA **'));
  out.push(...quebrar(`Cliente: ${semAcento(p.cliente_nome)}`));

  // ----------------------------------------------------------------- itens
  out.push(linha());
  out.push(`ITENS (${pecas})`);
  out.push(linha());

  p.order_items.forEach((item, i) => {
    if (i > 0) out.push(separadorItem());
    out.push(...quebrar(`${item.quantidade}x ${semAcento(item.nome)}`));
    out.push(...parYValor('', formatPrice(Number(item.total))));
    for (const o of item.opcoes) {
      const qtd = o.quantidade > 1 ? `${o.quantidade}x ` : '';
      out.push(...quebrar(`  ${semAcento(o.grupo)}: ${qtd}${semAcento(o.opcao)}`, COLUNAS, '    '));
    }
    if (item.observacao) {
      out.push(...quebrar(`  OBS: ${semAcento(item.observacao)}`, COLUNAS, '       '));
    }
  });

  // ---------------------------------------------------------------- contas
  out.push(linha());
  out.push(...parYValor('Subtotal', formatPrice(Number(p.subtotal))));
  if (Number(p.desconto) > 0) {
    const rotulo = p.cupom_codigo ? `Desconto (${semAcento(p.cupom_codigo)})` : 'Desconto';
    out.push(...parYValor(rotulo, `-${formatPrice(Number(p.desconto))}`));
  }
  if (Number(p.taxa_entrega) > 0) {
    const dist = p.distancia_km ? ` (${p.distancia_km} km)` : '';
    out.push(...parYValor(`Taxa de entrega${dist}`, formatPrice(Number(p.taxa_entrega))));
  }
  if (Number(p.taxa_servico) > 0) {
    out.push(...parYValor('Taxa de servico', formatPrice(Number(p.taxa_servico))));
  }
  out.push(linha('='));
  out.push(...parYValor('TOTAL', formatPrice(Number(p.total))));
  out.push(linha('='));

  // ------------------------------------------------------------- pagamento
  out.push(`Pagamento: ${semAcento(paymentLabels[p.pagamento])}`);
  if (p.troco_para) {
    const troco = Number(p.troco_para) - Number(p.total);
    out.push(...parYValor('Troco para', formatPrice(Number(p.troco_para))));
    // O troco é o que o entregador precisa separar antes de sair; fica marcado
    // para não se perder no meio das outras linhas.
    if (troco > 0) out.push(centralizar(`>> LEVAR ${formatPrice(troco)} <<`));
  }
  out.push(`Talheres: ${p.talheres ? 'SIM' : 'NAO'}`);

  // -------------------------------------------------------------- endereço
  if (entrega) {
    out.push(linha());
    out.push('ENDERECO DE ENTREGA');
    out.push(...quebrar(semAcento(p.endereco ?? '(nao informado)')));
    if (p.complemento) out.push(...quebrar(semAcento(p.complemento)));
  } else if (loja.endereco) {
    out.push(linha());
    out.push('RETIRAR EM');
    out.push(...quebrar(semAcento(loja.endereco)));
  }

  // O código repetido no pé resolve a pilha de comandas na hora do movimento:
  // dá para achar a certa sem desenrolar cada uma até o topo.
  out.push(linha('='));
  out.push(centralizar(p.codigo));
  out.push(linha('='));

  return out.join('\n');
};

/**
 * Abre a comanda pronta para imprimir.
 *
 * Janela separada em vez de `@media print` na própria página: a folha de estilo
 * do aplicativo inteiro precisaria ser neutralizada, e qualquer classe nova em
 * qualquer tela poderia vazar para o papel. Uma página isolada com CSS próprio
 * imprime igual hoje e daqui a um ano.
 */
export const imprimirComanda = (p: PedidoImpressao, loja: LojaImpressao) => {
  const janela = window.open('', '_blank', 'width=380,height=650');
  if (!janela) {
    throw new Error('O navegador bloqueou a janela de impressão.');
  }

  janela.document.write(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Comanda ${escapar(p.codigo)}</title>
<style>
  /* 80mm de bobina, com uma margem estreita de cada lado */
  @page { size: 80mm auto; margin: 3mm; }
  body {
    margin: 0;
    font-family: "Courier New", ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.35;
    color: #000;
    background: #fff;
  }
  pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
  .acoes { padding: 12px; display: flex; gap: 8px; }
  button {
    flex: 1; padding: 12px; font-size: 14px; font-weight: 700;
    border: 1px solid #000; background: #fff; cursor: pointer; border-radius: 6px;
  }
  @media print { .acoes { display: none; } }
</style></head>
<body>
<pre>${escapar(textoComanda(p, loja))}</pre>
<div class="acoes">
  <button onclick="window.print()">Imprimir</button>
  <button onclick="window.close()">Fechar</button>
</div>
</body></html>`);
  janela.document.close();

  // Impressão disparada daqui, não por um <script> dentro do HTML: o documento
  // escrito por `document.write` já está pronto quando `close()` retorna, e sem
  // script embutido a janela não executa nada que venha do pedido.
  janela.focus();
  janela.print();
};
