import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppBarProps {
  title: string;
  subtitle?: string;
  /** Para onde voltar quando não houver histórico (entrada direta pela URL). */
  fallback?: string;
  right?: ReactNode;
  className?: string;
}

export const AppBar = ({
  title,
  subtitle,
  fallback = '/',
  right,
  className,
}: AppBarProps) => {
  const navigate = useNavigate();

  const voltar = () => {
    // Entrando direto pela URL não há para onde voltar; sem este desvio o
    // botão não faria nada e pareceria quebrado.
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback, { replace: true });
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm pt-safe',
        className,
      )}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          onClick={voltar}
          aria-label="Voltar"
          className="press-sm tap-target flex items-center justify-center rounded-full text-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {right}
      </div>
    </header>
  );
};
