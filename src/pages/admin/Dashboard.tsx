import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, Power } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { SectionCard } from '@/components/base/primitives';
import { lerConfiguracao, salvarConfiguracao } from '@/lib/admin-api';
import { supabase } from '@/lib/supabase';
import { useAlerta } from '@/hooks/use-alerta-pedidos';
import { CATALOG_KEY } from '@/data/catalog';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Meia-noite local de hoje, deslocada em `dias`. */
const meiaNoite = (dias = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d;
};

interface Resumo {
  pedidos: number;
  faturamento: number;
}

/**
 * Um dia fechado, pelo próprio banco.
 *
 * Antes os números saíam dos pedidos já carregados na tela, o que servia para
 * "hoje" e não servia para "ontem": a listagem traz os mais recentes, e um dia
 * movimentado empurra o dia anterior para fora dela. `relatorio_resumo` já
 * recebe intervalo e já ignora cancelados no faturamento.
 */
const useResumoDoDia = (dias: number) =>
  useQuery({
    queryKey: ['admin', 'resumo-dia', dias],
    queryFn: async (): Promise<Resumo> => {
      const { data, error } = await supabase.rpc('relatorio_resumo', {
        p_inicio: meiaNoite(dias).toISOString(),
        p_fim: meiaNoite(dias + 1).toISOString(),
      });
      if (error) throw new Error(error.message);
      return data as Resumo;
    },
    staleTime: 60_000,
  });

const Dashboard = () => {
  const qc = useQueryClient();

  const config = useQuery({ queryKey: ['admin', 'config'], queryFn: lerConfiguracao });

  const alternarLoja = useMutation({
    mutationFn: (aberta: boolean) => salvarConfiguracao({ aberta }),
    onSuccess: (_d, aberta) => {
      qc.invalidateQueries({ queryKey: ['admin', 'config'] });
      // Invalida o catálogo do cliente: quem estiver com a página aberta vê a
      // mudança na próxima revalidação, sem precisar recarregar.
      qc.invalidateQueries({ queryKey: CATALOG_KEY });
      toast.success(aberta ? 'Loja aberta' : 'Loja fechada', {
        description: aberta
          ? 'Os clientes já podem fazer pedidos.'
          : 'Novos pedidos ficam bloqueados até reabrir.',
      });
    },
    onError: (e: Error) => toast.error('Não foi possível alterar', { description: e.message }),
  });

  const hoje = useResumoDoDia(0);
  const ontem = useResumoDoDia(-1);
  // Pendente não é do dia: um pedido de ontem que ninguém aceitou continua
  // esperando, e some do painel se a conta olhar só para hoje.
  const { pendentes } = useAlerta();

  const aberta = config.data?.aberta ?? false;

  return (
    <AdminShell>
      <SectionCard className="mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
              aberta ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
            )}
          >
            <Power className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-foreground">
              {config.isPending ? '...' : aberta ? 'Loja aberta' : 'Loja fechada'}
            </p>
            <p className="text-xs text-muted-foreground">
              {aberta ? 'Recebendo pedidos' : 'Novos pedidos bloqueados'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={aberta}
            aria-label="Loja aberta"
            disabled={config.isPending || alternarLoja.isPending}
            onClick={() => alternarLoja.mutate(!aberta)}
            className="press-sm tap-target flex shrink-0 items-center justify-center disabled:opacity-50"
          >
            <span
              className={cn(
                'flex h-7 w-12 items-center rounded-full p-1 transition-colors',
                aberta ? 'bg-success' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-full bg-card shadow-card transition-transform',
                  aberta && 'translate-x-5',
                )}
              />
            </span>
          </button>
        </div>
      </SectionCard>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { rotulo: 'Pedidos hoje', valor: String(hoje.data?.pedidos ?? 0), pronto: !hoje.isPending },
          { rotulo: 'Pedidos ontem', valor: String(ontem.data?.pedidos ?? 0), pronto: !ontem.isPending },
          { rotulo: 'Pendentes', valor: String(pendentes), pronto: true, destaque: pendentes > 0 },
          {
            rotulo: 'Faturamento hoje',
            valor: formatPrice(Number(hoje.data?.faturamento ?? 0)),
            pronto: !hoje.isPending,
          },
          {
            rotulo: 'Faturamento ontem',
            valor: formatPrice(Number(ontem.data?.faturamento ?? 0)),
            pronto: !ontem.isPending,
          },
        ].map(({ rotulo, valor, pronto, destaque }) => (
          <SectionCard
            key={rotulo}
            className={cn('p-3 text-center', destaque && 'bg-aviso')}
          >
            <p className={cn('text-xs', destaque ? 'text-aviso-foreground' : 'text-muted-foreground')}>
              {rotulo}
            </p>
            <p
              className={cn(
                'mt-1 truncate text-base font-extrabold',
                destaque ? 'text-aviso-foreground' : 'text-foreground',
              )}
            >
              {pronto ? valor : '...'}
            </p>
          </SectionCard>
        ))}
      </div>

      <div className="surface divide-y divide-border">
        {[
          { to: '/admin/pedidos', label: 'Pedidos', desc: 'Acompanhar e mudar status' },
          { to: '/admin/relatorios', label: 'Relatórios', desc: 'Vendas, faturamento e mais vendidos' },
          { to: '/admin/produtos', label: 'Produtos', desc: 'Cardápio, preços e disponibilidade' },
          { to: '/admin/grupos', label: 'Grupos de opções', desc: 'Personalização dos itens' },
          { to: '/admin/cupons', label: 'Cupons', desc: 'Descontos e regras' },
          { to: '/admin/loja', label: 'Dados da loja', desc: 'Taxas, contato e fotos' },
        ].map(({ to, label, desc }) => (
          <Link key={to} to={to} className="press-sm flex items-center gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">{label}</span>
              <span className="block text-xs text-muted-foreground">{desc}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </AdminShell>
  );
};

export default Dashboard;
