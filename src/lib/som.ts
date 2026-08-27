/**
 * Sons de notificação sintetizados.
 *
 * Sem arquivo de áudio: osciladores curtos via Web Audio API resolvem, não
 * pesam no pacote e funcionam offline. Um MP3 de meio segundo custaria mais e
 * ainda precisaria ser baixado antes do primeiro alerta.
 *
 * Navegadores bloqueiam áudio antes de qualquer gesto do usuário. No admin o
 * login já serve de gesto; no acompanhamento, o envio do pedido. Se ainda assim
 * o contexto vier bloqueado, falha em silêncio — o aviso visual sempre aparece.
 */

let contexto: AudioContext | null = null;
let saida: AudioNode | null = null;

/**
 * Compressor na saída de tudo.
 *
 * Alarme de cozinha precisa de volume, e volume com onda quadrada satura o
 * alto-falante do celular. O compressor segura os picos e deixa subir o ganho
 * médio: fica mais alto de verdade, sem estalar.
 */
const obterContexto = (
  { criar = false }: { criar?: boolean } = {},
): { ctx: AudioContext; destino: AudioNode } | null => {
  if (typeof window === 'undefined') return null;
  // Fora de um gesto do usuário o navegador recusa iniciar o áudio e ainda
  // reclama no console a cada tentativa. Como o alarme insiste sozinho a cada
  // 15s, criar o contexto aqui encheria o console de avisos inúteis: quem cria
  // é `prepararSom`, chamado a partir de um clique.
  if (!contexto && !criar) return null;
  try {
    if (!contexto) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      contexto = new Ctor();

      const compressor = contexto.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.15;
      compressor.connect(contexto.destination);
      saida = compressor;
    }
    // O contexto nasce suspenso até o primeiro gesto; retomar é barato.
    if (contexto.state === 'suspended') void contexto.resume();
    return saida ? { ctx: contexto, destino: saida } : null;
  } catch {
    return null;
  }
};

interface Nota {
  hz: number;
  inicio: number;
  duracao: number;
  tipo?: OscillatorType;
  volume?: number;
}

const tocarNota = (
  ctx: AudioContext,
  destino: AudioNode,
  { hz, inicio, duracao, tipo = 'sine', volume = 0.18 }: Nota,
) => {
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = tipo;
  osc.frequency.value = hz;

  const t = ctx.currentTime + inicio;
  // Envelope curto: sem o fade o corte seco estala no alto-falante.
  ganho.gain.setValueAtTime(0, t);
  ganho.gain.linearRampToValueAtTime(volume, t + 0.008);
  ganho.gain.setValueAtTime(volume, t + duracao - 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.001, t + duracao);

  osc.connect(ganho).connect(destino);
  osc.start(t);
  osc.stop(t + duracao + 0.02);
};

/** Quantos segundos o alarme ocupa, para quem precisa agendar a repetição. */
export const DURACAO_ALARME = 2.0;

/**
 * Alarme de pedido novo.
 *
 * Sirene de duas notas alternadas, quatro ciclos, em onda quadrada. A quadrada
 * espalha energia por harmônicos agudos em vez de concentrar numa frequência
 * só — é o que faz um alarme atravessar o barulho de uma chapa, enquanto a
 * senoidal educada que havia antes sumia debaixo dele.
 */
export const somPedidoNovo = () => {
  const c = obterContexto();
  if (!c) return;
  const { ctx, destino } = c;

  const CICLOS = 4;
  const PASSO = 0.25;
  for (let i = 0; i < CICLOS; i += 1) {
    const base = i * PASSO * 2;
    tocarNota(ctx, destino, {
      hz: 880, inicio: base, duracao: PASSO - 0.04, tipo: 'square', volume: 0.5,
    });
    tocarNota(ctx, destino, {
      hz: 1175, inicio: base + PASSO, duracao: PASSO - 0.04, tipo: 'square', volume: 0.5,
    });
  }
};

/**
 * Nota única e curta: o status do pedido mudou.
 *
 * Continua senoidal e discreta de propósito — quem ouve é o cliente esperando
 * o lanche, e ali o objetivo é avisar, não alarmar.
 */
export const somStatus = () => {
  const c = obterContexto();
  if (!c) return;
  tocarNota(c.ctx, c.destino, { hz: 660, inicio: 0, duracao: 0.12 });
  tocarNota(c.ctx, c.destino, { hz: 990, inicio: 0.13, duracao: 0.18 });
};

/**
 * Prepara o áudio dentro de um gesto do usuário.
 *
 * Chamar isto num clique deixa o contexto pronto para tocar depois, quando o
 * alerta chegar sozinho — que é justamente quando o navegador não permitiria
 * criar o contexto do zero.
 */
export const prepararSom = () => {
  obterContexto({ criar: true });
};

/**
 * Destrava o áudio no primeiro toque em qualquer lugar da página.
 *
 * O login já é um gesto, mas quem recarrega o painel com a sessão salva não
 * clica em nada — e o primeiro alarme sairia mudo. Um ouvinte único no
 * documento resolve sem pedir nada ao usuário.
 *
 * Devolve a função de limpeza, para o componente remover o ouvinte ao sair.
 */
export const destravarSomNoPrimeiroToque = () => {
  if (typeof document === 'undefined') return () => {};
  const destravar = () => prepararSom();
  document.addEventListener('pointerdown', destravar, { once: true });
  document.addEventListener('keydown', destravar, { once: true });
  return () => {
    document.removeEventListener('pointerdown', destravar);
    document.removeEventListener('keydown', destravar);
  };
};
