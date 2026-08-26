import { useEffect, useRef } from 'react';
import { iconePorNome, type Category, type CategoryInfo } from '@/types/order';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface CategoryChipsProps {
  categories: CategoryInfo[];
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
  countByCategory?: Partial<Record<Category, number>>;
}

/**
 * Navegação por categoria. Herda do tema escuro tudo o que já estava certo:
 * ancoragem de rolagem, semântica de tablist, navegação por setas e o chip
 * ativo trazido para o centro.
 */
export const CategoryChips = ({
  categories,
  activeCategory,
  onCategoryChange,
  countByCategory = {},
}: CategoryChipsProps) => {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Sem isto, escolher a última categoria e voltar ao topo deixa a aba
  // selecionada fora da viewport horizontal.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeCategory]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = categories.findIndex((c) => c.slug === activeCategory);
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const proxima = categories[(index + offset + categories.length) % categories.length];
    if (proxima) onCategoryChange(proxima.slug);
  };

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-background to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-background to-transparent"
        />

        <div
          role="tablist"
          aria-label="Categorias do cardápio"
          onKeyDown={handleKeyDown}
          className="no-scrollbar snap-x-mandatory flex gap-2 overflow-x-auto px-4 py-3"
        >
          {categories.map(({ slug, label, icon }) => {
            const Icon = iconePorNome(icon);
            const isActive = slug === activeCategory;
            const count = countByCategory[slug] ?? 0;

            return (
              <button
                key={slug}
                ref={isActive ? activeRef : undefined}
                role="tab"
                type="button"
                id={`tab-${slug}`}
                aria-selected={isActive}
                aria-controls="painel-produtos"
                tabIndex={isActive ? 0 : -1}
                onClick={() => {
                  if (isActive) return;
                  haptic('light');
                  onCategoryChange(slug);
                }}
                className={cn(
                  'snap-start-always press-sm tap-target flex shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-button'
                    : 'bg-card text-foreground shadow-card',
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />
                <span>{label}</span>

                {count > 0 && (
                  <span
                    className={cn(
                      'ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                      isActive
                        ? 'bg-primary-foreground/25 text-primary-foreground'
                        : 'bg-primary text-primary-foreground',
                    )}
                  >
                    {count}
                    <span className="sr-only"> itens no carrinho</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
