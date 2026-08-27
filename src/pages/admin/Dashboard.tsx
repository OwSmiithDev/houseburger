import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, Power } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { SectionCard } from '@/components/base/primitives';
import { lerConfiguracao, listarPedidos, salvarConfiguracao } from '@/lib/admin-api';
import { CATALOG_KEY } from '@/data/catalog';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const hoje = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const Dashboard = () => {
  const qc = useQueryClient();

  const config = useQuery({ queryKey: ['admin', 'config'], queryFn: lerConfiguracao });
  const pedidos = useQuery({ queryKey: ['admin', 'pedidos'], queryFn: () => listarPedidos(100) });

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

  const doDia = (pedidos.data ?? []).filter(
    (p) => new Date(p.criado_em) >= hoje() && p.status !== 'cancelado',
  );
  const faturamento = doDia.reduce((s, p) => s + Number(p.total), 0);
  const pendentes = doDia.filter((p) => p.status === 'pendente').length;

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

      <div className="mb-3 grid grid-cols-3 gap-2 md:grid-cols-6">
        {[
          { rotulo: 'Pedidos hoje', valor: String(doDia.length) },
          { rotulo: 'Pendentes', valor: String(pendentes) },
          { rotulo: 'Faturamento', valor: formatPrice(faturamento) },
        ].map(({ rotulo, valor }) => (
          <SectionCard key={rotulo} className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{rotulo}</p>
            <p className="mt-1 truncate text-base font-extrabold text-foreground">
              {pedidos.isPending ? '...' : valor}
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
