import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { listarCupons, removerCupom, salvarCupom } from '@/lib/admin-api';
import { CATALOG_KEY } from '@/data/catalog';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const campo =
  'h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-foreground focus:border-ring focus:outline-none';

const descreveRegra = (tipo: string, valor: number) => {
  if (tipo === 'percent') return `${Math.round(valor * 100)}% de desconto`;
  if (tipo === 'fixed') return `${formatPrice(valor)} de desconto`;
  return 'Entrega grátis';
};

const Coupons = () => {
  const qc = useQueryClient();
  const [novo, setNovo] = useState(false);

  const cupons = useQuery({ queryKey: ['admin', 'cupons'], queryFn: listarCupons });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'cupons'] });
    qc.invalidateQueries({ queryKey: CATALOG_KEY });
  };
  const erro = (e: Error) => toast.error('Não foi possível salvar', { description: e.message });

  const salvar = useMutation({ mutationFn: salvarCupom, onSuccess: invalidar, onError: erro });
  const excluir = useMutation({ mutationFn: removerCupom, onSuccess: invalidar, onError: erro });

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-black text-foreground">Cupons</h1>
        <button
          type="button"
          onClick={() => setNovo((v) => !v)}
          className="press flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo
        </button>
      </div>

      {/* O cliente valida o cupom no navegador; quem confere de verdade é a
          loja ao ler a comanda. Dizer isso evita confiança indevida. */}
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          O desconto é recalculado pelo servidor ao registrar o pedido, então o
          valor da comanda é sempre o correto. Ainda assim, confira o cupom
          aplicado antes de confirmar com o cliente.
        </p>
      </div>

      {novo && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            const dados = new FormData(f);
            const tipo = String(dados.get('tipo'));
            const bruto = Number(dados.get('valor') ?? 0);
            salvar.mutate(
              {
                codigo: String(dados.get('codigo')).toUpperCase().trim(),
                descricao: String(dados.get('descricao')),
                tipo,
                // Percentual é digitado como 10 e guardado como 0.1.
                valor: tipo === 'percent' ? bruto / 100 : tipo === 'shipping' ? 0 : bruto,
                min_subtotal: Number(dados.get('min') ?? 0),
                ativo: true,
              },
              {
                onSuccess: () => {
                  setNovo(false);
                  f.reset();
                  toast.success('Cupom criado');
                },
              },
            );
          }}
          className="surface animate-slide-down mb-4 space-y-3 p-4"
        >
          <input name="codigo" required placeholder="CÓDIGO" className={cn(campo, 'uppercase')} />
          <input name="descricao" required placeholder="Descrição para o cliente" className={campo} />
          <select name="tipo" className={campo} defaultValue="percent">
            <option value="percent">Percentual sobre o subtotal</option>
            <option value="fixed">Valor fixo em reais</option>
            <option value="shipping">Entrega grátis</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-bold text-foreground">Valor</span>
              <input
                onFocus={(e) => e.currentTarget.select()} name="valor" type="number" step="0.01" min="0" defaultValue={10} className={campo} />
              <span className="mt-1 block text-xs text-muted-foreground">
                Em percentual, digite 10 para 10%
              </span>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-bold text-foreground">Subtotal mínimo</span>
              <input
                onFocus={(e) => e.currentTarget.select()} name="min" type="number" step="0.01" min="0" defaultValue={0} className={campo} />
            </label>
          </div>
          <button type="submit" className="press h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground">
            Criar cupom
          </button>
        </form>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        {(cupons.data ?? []).map((c) => (
          <div key={c.id} className={cn('surface p-4', !c.ativo && 'opacity-50')}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-foreground">{c.codigo}</p>
                <p className="truncate text-xs text-muted-foreground">{c.descricao}</p>
                <p className="mt-1 text-xs text-success">
                  {descreveRegra(c.tipo, Number(c.valor))}
                  {Number(c.min_subtotal) > 0 &&
                    ` · a partir de ${formatPrice(Number(c.min_subtotal))}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => salvar.mutate({ ...c, ativo: !c.ativo })}
                className={cn(
                  'press-sm h-11 shrink-0 rounded-lg px-3 text-xs font-bold',
                  c.ativo ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
                )}
              >
                {c.ativo ? 'Ativo' : 'Inativo'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Remover o cupom ${c.codigo}?`)) excluir.mutate(c.id);
                }}
                aria-label={`Remover ${c.codigo}`}
                className="press-sm flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
};

export default Coupons;
