import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { CampoImagem } from '@/components/admin/CampoImagem';
import { SectionCard } from '@/components/base/primitives';
import { lerConfiguracao, salvarConfiguracao } from '@/lib/admin-api';
import { CATALOG_KEY } from '@/data/catalog';

const campo =
  'h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-foreground focus:border-ring focus:outline-none';

type Config = Record<string, unknown>;

const StoreSettings = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Config | null>(null);

  const config = useQuery({ queryKey: ['admin', 'config'], queryFn: lerConfiguracao });

  useEffect(() => {
    if (config.data && !form) setForm({ ...config.data });
  }, [config.data, form]);

  const salvar = useMutation({
    mutationFn: (dados: Config) => salvarConfiguracao(dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'config'] });
      qc.invalidateQueries({ queryKey: CATALOG_KEY });
      toast.success('Dados da loja atualizados');
    },
    onError: (e: Error) => toast.error('Não foi possível salvar', { description: e.message }),
  });

  if (!form) {
    return (
      <AdminShell>
        <p className="py-10 text-center text-muted-foreground">Carregando...</p>
      </AdminShell>
    );
  }

  const set = (chave: string, valor: unknown) => setForm({ ...form, [chave]: valor });
  const texto = (chave: string) => String(form[chave] ?? '');
  const numero = (chave: string) => Number(form[chave] ?? 0);

  return (
    <AdminShell>
      <h1 className="mb-4 text-lg font-black text-foreground">Dados da loja</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const { id, atualizado_em, ...dados } = form;
          void id;
          void atualizado_em;
          salvar.mutate(dados);
        }}
        className="space-y-3"
      >
        <SectionCard className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Identidade</h2>

          <label className="block text-sm">
            <span className="mb-1 block font-bold text-foreground">Nome</span>
            <input value={texto('nome')} onChange={(e) => set('nome', e.target.value)} className={campo} />
          </label>

          <CampoImagem
            rotulo="Banner"
            valor={texto('banner_url')}
            onChange={(url) => set('banner_url', url)}
          />
          <CampoImagem
            rotulo="Logo"
            valor={texto('logo_url')}
            onChange={(url) => set('logo_url', url)}
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-foreground">Avaliação</span>
              <input
                type="number" step="0.1" min="0" max="5"
                value={numero('avaliacao')}
                onChange={(e) => set('avaliacao', Number(e.target.value))}
                className={campo}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-foreground">Nº de avaliações</span>
              <input
                value={texto('avaliacoes')}
                onChange={(e) => set('avaliacoes', e.target.value)}
                placeholder="200+"
                className={campo}
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Contato e pagamento</h2>

          <label className="block text-sm">
            <span className="mb-1 block font-bold text-foreground">WhatsApp</span>
            <input
              value={texto('whatsapp')}
              onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className={campo}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Só números, com código do país e DDD. Ex.: 5562999718912
            </span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-bold text-foreground">Chave Pix</span>
            <input
              value={texto('chave_pix')}
              onChange={(e) => set('chave_pix', e.target.value)}
              className={campo}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Mostrada ao cliente que escolher pagar por Pix.
            </span>
          </label>
        </SectionCard>

        <SectionCard className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Entrega e taxas</h2>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-foreground">Tempo mín. (min)</span>
              <input
                type="number" min="0"
                value={numero('tempo_min')}
                onChange={(e) => set('tempo_min', Number(e.target.value))}
                className={campo}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-foreground">Tempo máx. (min)</span>
              <input
                type="number" min="0"
                value={numero('tempo_max')}
                onChange={(e) => set('tempo_max', Number(e.target.value))}
                className={campo}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-foreground">Taxa de entrega</span>
              <input
                type="number" step="0.01" min="0"
                value={numero('taxa_entrega')}
                onChange={(e) => set('taxa_entrega', Number(e.target.value))}
                className={campo}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-foreground">Pedido mínimo</span>
              <input
                type="number" step="0.01" min="0"
                value={numero('pedido_minimo')}
                onChange={(e) => set('pedido_minimo', Number(e.target.value))}
                className={campo}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-bold text-foreground">Taxa de serviço (%)</span>
            <input
              type="number" step="0.1" min="0" max="100"
              value={(numero('taxa_servico') * 100).toFixed(1)}
              onChange={(e) => set('taxa_servico', Number(e.target.value) / 100)}
              className={campo}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Zero remove a linha do resumo do cliente.
            </span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-bold text-foreground">Sugestões de gorjeta</span>
            <input
              value={(form.gorjetas as number[] | null)?.join(', ') ?? ''}
              onChange={(e) =>
                set(
                  'gorjetas',
                  e.target.value
                    .split(',')
                    .map((v) => Number(v.trim()))
                    .filter((v) => Number.isFinite(v) && v > 0),
                )
              }
              placeholder="2, 3, 5"
              className={campo}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Valores em reais, separados por vírgula.
            </span>
          </label>
        </SectionCard>

        <button
          type="submit"
          disabled={salvar.isPending}
          className="press h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
        >
          {salvar.isPending ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </AdminShell>
  );
};

export default StoreSettings;
