import { useEffect, useRef } from 'react';
import { Category, categories, categoryLabels, categoryIcons } from '@/types/order';
import { haptic } from '@/lib/haptics';

interface CategoryTabsProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
  /** Quantos itens do carrinho vêm de cada categoria, para o indicador no chip */
  countByCategory?: Partial<Record<Category, number>>;
}

export const CategoryTabs = ({
  activeCategory,
  onCategoryChange,
  countByCategory = {},
}: CategoryTabsProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Mantém o chip ativo visível: sem isso, escolher "Cremes" (última) e voltar
  // ao topo deixa a aba selecionada fora da viewport horizontal.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeCategory]);

  // Setas ← → percorrem as abas, como manda o padrão ARIA de tablist
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();

    const index = categories.indexOf(activeCategory);
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const next = categories[(index + offset + categories.length) % categories.length];
    onCategoryChange(next);
  };

  const handleSelect = (category: Category) => {
    if (category === activeCategory) return;
    haptic('light');
    onCategoryChange(category);
  };

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="relative">
        {/* Esmaecimento nas bordas: sinaliza que a lista continua além da tela */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background to-transparent"
        />

        <div
          ref={scrollerRef}
          role="tablist"
          aria-label="Categorias do cardápio"
          onKeyDown={handleKeyDown}
          className="no-scrollbar snap-x-mandatory flex gap-2 overflow-x-auto px-4 py-3"
        >
          {categories.map((category) => {
            const Icon = categoryIcons[category];
            const isActive = category === activeCategory;
            const count = countByCategory[category] ?? 0;

            return (
              <button
                key={category}
                ref={isActive ? activeRef : undefined}
                role="tab"
                type="button"
                id={`tab-${category}`}
                aria-selected={isActive}
                aria-controls="painel-produtos"
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleSelect(category)}
                className={`snap-start-always press-sm tap-target relative flex shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
                  isActive
                    ? 'gradient-hero text-primary-foreground shadow-button'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />
                <span>{categoryLabels[category]}</span>

                {count > 0 && (
                  <span
                    className={`ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                      isActive
                        ? 'bg-primary-foreground/25 text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
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
