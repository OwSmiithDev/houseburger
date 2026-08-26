import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BottomBarProps {
  /** Nome da região para leitores de tela. */
  label?: string;
  /** Bloco à esquerda: normalmente o total. */
  left?: ReactNode;
  /** Faixa acima da barra: aviso de mínimo, cupom, progresso. */
  above?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Barra fixa inferior — o padrão mais repetido das telas de pedido.
 *
 * Centralizar aqui evita reimplementar área segura e altura mínima de toque em
 * cada tela. O conteúdo da página reserva o espaço com a classe `pb-bar`.
 */
export const BottomBar = ({
  label = 'Ações do pedido',
  left,
  above,
  children,
  className,
}: BottomBarProps) => {
  const ref = useRef<HTMLDivElement>(null);

  /*
   * A altura da barra varia: com ou sem a faixa de aviso, e com uma ou duas
   * linhas de texto. Um valor fixo em `pb-bar` deixaria o conteúdo por baixo
   * sempre que a faixa aparecesse. Medir e publicar em --bar-h resolve para
   * todos os casos, inclusive quando o texto quebra em telas estreitas.
   */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const publicar = () =>
      document.documentElement.style.setProperty('--bar-h', `${el.offsetHeight}px`);

    publicar();
    const observer = new ResizeObserver(publicar);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--bar-h');
    };
  }, []);

  return (
  // Região nomeada: uma barra fixa de ação precisa ser alcançável por leitor
  // de tela sem depender de o usuário chegar nela rolando até o fim.
  <div ref={ref} role="region" aria-label={label} className="fixed inset-x-0 bottom-0 z-40">
    {above}
    <div
      className={cn(
        'shadow-bar flex items-center gap-3 border-t border-border bg-card px-4 pt-3 pb-safe',
        className,
      )}
    >
      {left && <div className="min-w-0 shrink-0">{left}</div>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
    {/* Preenche a faixa da área segura para o fundo não vazar sob a barra */}
    <div className="h-[max(0px,var(--safe-bottom))] bg-card" aria-hidden="true" />
  </div>
  );
};

interface BarButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  type?: 'button' | 'submit';
  'aria-label'?: string;
}

/** CTA principal da barra. Desabilitado é visivelmente inerte, não só cinza. */
export const BarButton = ({
  onClick,
  disabled,
  children,
  type = 'button',
  ...rest
}: BarButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-bold transition-colors',
      disabled
        ? 'cursor-not-allowed bg-muted text-muted-foreground'
        : 'press bg-primary text-primary-foreground shadow-button',
    )}
    {...rest}
  >
    {children}
  </button>
);
