/**
 * Sons de notificação sintetizados.
 *
 * Sem arquivo de áudio: dois osciladores curtos via Web Audio API resolvem, não
 * pesam no pacote e funcionam offline. Um MP3 de meio segundo custaria mais e
 * ainda precisaria ser baixado antes do primeiro alerta.
 *
 * Navegadores bloqueiam áudio antes de qualquer gesto do usuário. No admin o
 * login já serve de gesto; no acompanhamento, o envio do pedido. Se ainda assim
 * o contexto vier bloqueado, falha em silêncio — o aviso visual sempre aparece.
 */

let contexto: AudioContext | null = null;

const obterContexto = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    if (!contexto) {
      const Ctor = window.AudioContext ?? (window as unknown as {
        webkitAudioContext: typeof AudioContext;
      }).webkitAudioContext;
      if (!Ctor) return null;
      contexto = new Ctor();
    }
    // O contexto nasce suspenso até o primeiro gesto; retomar é barato.
    if (contexto.state === 'suspended') void contexto.resume();
    return contexto;
  } catch {
    return null;
  }
};

const tocarNota = (ctx: AudioContext, hz: number, inicio: number, duracao: number) => {
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = hz;

  // Envelope curto: sem o fade o corte seco estala no alto-falante.
  ganho.gain.setValueAtTime(0, ctx.currentTime + inicio);
  ganho.gain.linearRampToValueAtTime(0.18, ctx.currentTime + inicio + 0.01);
  ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);

  osc.connect(ganho).connect(ctx.destination);
  osc.start(ctx.currentTime + inicio);
  osc.stop(ctx.currentTime + inicio + duracao + 0.02);
};

/** Duas notas ascendentes: pedido novo chegou. */
export const somPedidoNovo = () => {
  const ctx = obterContexto();
  if (!ctx) return;
  tocarNota(ctx, 880, 0, 0.14);
  tocarNota(ctx, 1320, 0.16, 0.22);
};

/** Nota única e curta: o status do pedido mudou. */
export const somStatus = () => {
  const ctx = obterContexto();
  if (!ctx) return;
  tocarNota(ctx, 660, 0, 0.12);
  tocarNota(ctx, 990, 0.13, 0.18);
};

/**
 * Prepara o áudio dentro de um gesto do usuário.
 *
 * Chamar isto num clique deixa o contexto pronto para tocar depois, quando o
 * alerta chegar sozinho — que é justamente quando o navegador não permitiria
 * criar o contexto do zero.
 */
export const prepararSom = () => {
  obterContexto();
};
