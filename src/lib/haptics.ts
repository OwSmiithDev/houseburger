/**
 * Feedback tátil para confirmações e ações relevantes.
 *
 * Reservado a mudanças de estado reais (item no carrinho, etapa concluída) —
 * vibrar a cada toque cansa e faz o usuário desligar a permissão.
 * Silencioso onde a API não existe (iOS Safari) ou onde o usuário
 * pediu menos movimento.
 */
type Pattern = 'light' | 'success' | 'warning';

const patterns: Record<Pattern, number | number[]> = {
  light: 10,
  success: [12, 40, 18],
  warning: [30, 60, 30],
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const haptic = (pattern: Pattern = 'light') => {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  if (prefersReducedMotion()) return;

  try {
    navigator.vibrate(patterns[pattern]);
  } catch {
    /* alguns navegadores bloqueiam sem interação do usuário — ignorar */
  }
};
