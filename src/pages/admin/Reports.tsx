import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminShell } from '@/components/admin/AdminShell';
import { SectionCard } from '@/components/base/primitives';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import { paymentLabels, type PaymentMethod } from '@/types/order';
import { cn } from '@/lib/utils';

type Granularidade = 'day' | 'week' | 'month';

interface Resumo {
  pedidos: number;
  entregues: number;
  cancelados: number;
  em_andamento: number;
  faturamento: number;
  ticket_medio: number;
  entrega: number;
  retirada: number;
  taxa_entrega_total: number;
  desconto_total: number;
}

/**
 * Períodos oferecidos.
 *
 * `fim` é sempre exclusivo — o SQL usa `< fim`, senão um pedido feito
 * exatamente à meia-noite entraria em dois períodos.
 */
const periodos = {
  hoje: { rotulo: 'Hoje', dias: 0, gran: 'day' as Granularidade },
  semana: { rotulo: '7 dias', dias: 7, gran: 'day' as Granularidade },
  mes: { rotulo: '30 dias', dias: 30, gran: 'day' as Granularidade },
  trimestre: { rotulo: '90 dias', dias: 90, gran: 'week' as Granularidade },
  ano: { rotulo: '12 meses', dias: 365, gran: 'month' as Granularidade },
};

type ChavePeriodo = keyof typeof periodos;

const intervalo = (chave: ChavePeriodo) => {
  const fim = new Date();
  fim.setHours(23, 59, 59, 999);
  fim.setMilliseconds(1000);

  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  if (periodos[chave].dias > 0) {
    inicio.setDate(inicio.getDate() - periodos[chave].dias + 1);
  }
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
};

const rotuloPeriodo = (iso: string, gran: Granularidade) => {
  const d = new Date(iso);
  if (gran === 'month') {
    return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const Reports = () => {
  const [periodo, setPeriodo] = useState<ChavePeriodo>('semana');
  const [gran, setGran] = useState<Granularidade | null>(null);

  const granEfetiva = gran ?? periodos[periodo].gran;
  const { inicio, fim } = useMemo(() => intervalo(periodo), [periodo]);

  const chamar = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  };

  const resumo = useQuery({
    queryKey: ['admin', 'relatorio', 'resumo', inicio, fim],
    queryFn: () => chamar<Resumo>('relatorio_resumo', { p_inicio: inicio, p_fim: fim }),
  });

  const serie = useQuery({
    queryKey: ['admin', 'relatorio', 'serie', inicio, fim, granEfetiva],
    queryFn: () =>
      chamar<Array<{ periodo: string; pedidos: number; faturamento: number }>>(
        'relatorio_serie',
        { p_inicio: inicio, p_fim: fim, p_granularidade: granEfetiva },
      ),
  });

  const detalhes = useQuery({
    queryKey: ['admin', 'relatorio', 'detalhes', inicio, fim],
    queryFn: () =>
      chamar<{
        itens: Array<{ nome: string; quantidade: number; faturamento: number }>;
        pagamentos: Array<{ pagamento: PaymentMethod; pedidos: number; faturamento: number }>;
      }>('relatorio_detalhes', { p_inicio: inicio, p_fim: fim }),
  });

  const r = resumo.data;
  const carregando = resumo.isPending;

  const dadosGrafico = (serie.data ?? []).map((p) => ({
    rotulo: rotuloPeriodo(p.periodo, granEfetiva),
    faturamento: Number(p.faturamento),
    pedidos: Number(p.pedidos),
  }));

  const cancelamento =
    r && r.pedidos > 0 ? Math.round((r.cancelados / r.pedidos) * 100) : 0;

  const cartoes = [
    { rotulo: 'Faturamento', valor: formatPrice(Number(r?.faturamento ?? 0)), destaque: true },
    { rotulo: 'Pedidos', valor: String(r?.pedidos ?? 0) },
    { rotulo: 'Ticket médio', valor: formatPrice(Number(r?.ticket_medio ?? 0)) },
    { rotulo: 'Entregues', valor: String(r?.entregues ?? 0) },
    { rotulo: 'Em andamento', valor: String(r?.em_andamento ?? 0) },
    { rotulo: 'Cancelados', valor: `${r?.cancelados ?? 0} (${cancelamento}%)` },
  ];

  return (
    <AdminShell>
      <h1 className="mb-4 text-lg font-black text-foreground">Relatórios de vendas</h1>

      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {(Object.keys(periodos) as ChavePeriodo[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setPeriodo(k);
              setGran(null);
            }}
            className={cn(
              'press-sm h-11 shrink-0 rounded-full px-4 text-sm font-semibold',
              periodo === k
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground shadow-card',
            )}
          >
            {periodos[k].rotulo}
          </button>
        ))}
      </div>

      {resumo.isError && (
        <p role="alert" className="rounded-xl border border-alerta-border bg-alerta p-3 text-sm text-alerta-foreground">
          Não foi possível carregar: {(resumo.error as Error).message}
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cartoes.map(({ rotulo, valor, destaque }) => (
          <SectionCard key={rotulo} className="p-3">
            <p className="text-xs text-muted-foreground">{rotulo}</p>
            <p
              className={cn(
                'mt-1 truncate font-extrabold tabular-nums text-foreground',
                destaque ? 'text-xl' : 'text-base',
              )}
            >
              {carregando ? '...' : valor}
            </p>
          </SectionCard>
        ))}
      </div>

      <SectionCard className="mb-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-foreground">Faturamento</h2>
          <div className="flex gap-1" role="group" aria-label="Agrupar por">
            {([
              ['day', 'Diário'],
              ['week', 'Semanal'],
              ['month', 'Mensal'],
            ] as const).map(([g, rotulo]) => (
              <button
                key={g}
                type="button"
                onClick={() => setGran(g)}
                className={cn(
                  'press-sm h-9 rounded-lg px-3 text-xs font-bold',
                  granEfetiva === g
                    ? 'bg-primary/12 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {serie.isPending ? (
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
        ) : dadosGrafico.every((d) => d.faturamento === 0) ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nenhuma venda neste período.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="rotulo"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v: number) => formatPrice(v).replace('R$ ', '')}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  separator=": "
                  labelClassName="font-semibold text-foreground"
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid hsl(var(--border))',
                    fontSize: 12,
                  }}
                  formatter={(v: number, nome) =>
                    nome === 'faturamento' ? [formatPrice(v), 'Faturamento'] : [v, 'Pedidos']
                  }
                />
                <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-3 md:grid-cols-2">
        <SectionCard>
          <h2 className="mb-3 text-base font-bold text-foreground">Entrega e retirada</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Entregas</dt>
              <dd className="font-semibold tabular-nums">{r?.entrega ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Retiradas</dt>
              <dd className="font-semibold tabular-nums">{r?.retirada ?? 0}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="text-muted-foreground">Taxas de entrega</dt>
              <dd className="font-semibold tabular-nums">
                {formatPrice(Number(r?.taxa_entrega_total ?? 0))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Descontos dados</dt>
              <dd className="font-semibold tabular-nums text-success">
                −{formatPrice(Number(r?.desconto_total ?? 0))}
              </dd>
            </div>
          </dl>

          <h3 className="mb-2 mt-4 text-sm font-bold text-foreground">Formas de pagamento</h3>
          {(detalhes.data?.pagamentos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados no período.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {(detalhes.data?.pagamentos ?? []).map((p) => (
                <li key={p.pagamento} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {paymentLabels[p.pagamento]} ({p.pedidos})
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatPrice(Number(p.faturamento))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard>
          <h2 className="mb-3 text-base font-bold text-foreground">Mais vendidos</h2>
          {(detalhes.data?.itens ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
          ) : (
            <ol className="space-y-2">
              {(detalhes.data?.itens ?? []).map((item, i) => (
                <li key={item.nome} className="flex items-center gap-3 text-sm">
                  <span className="w-5 shrink-0 text-center font-black text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{item.nome}</span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold tabular-nums text-foreground">
                      {item.quantidade}x
                    </span>
                    <span className="block text-xs tabular-nums text-muted-foreground">
                      {formatPrice(Number(item.faturamento))}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>
    </AdminShell>
  );
};

export default Reports;
