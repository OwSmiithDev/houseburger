import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { CampoImagem } from '@/components/admin/CampoImagem';
import { SeletorLocal } from '@/components/admin/SeletorLocal';
import { SectionCard } from '@/components/base/primitives';
import { lerConfiguracao, salvarConfiguracao } from '@/lib/admin-api';
import { CATALOG_KEY } from '@/data/catalog';
import { formatPrice } from '@/lib/format';
import { CampoNumero } from '@/components/base/CampoNumero';
import { cn } from '@/lib/utils';

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
  const porKm = String(form.entrega_modo ?? 'fixo') === 'km';
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
              <CampoNumero step="0.1" min="0" max="5"
                value={numero('avaliacao')}
                onChange={(v) => set('avaliacao', v)}
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
          <h2 className="text-sm font-bold text-foreground">Onde fica a loja</h2>

          <label className="block text-sm">
            <span className="mb-1 block font-bold text-foreground">Endereco</span>
            <input
              value={texto('endereco')}
              onChange={(e) => set('endereco', e.target.value)}
              placeholder="Rua, numero, bairro, cidade"
              className={campo}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Mostrado a quem escolhe retirar no balcao.
            </span>
          </label>

          <SeletorLocal
            lat={form.lat === null || form.lat === undefined ? null : Number(form.lat)}
            lng={form.lng === null || form.lng === undefined ? null : Number(form.lng)}
            onChange={(lat, lng) => setForm({ ...form, lat, lng })}
          />
        </SectionCard>

        <SectionCard className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Entrega e taxas</h2>

          <fieldset>
            <legend className="mb-2 text-sm font-bold text-foreground">
              Como cobrar a entrega
            </legend>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Modo de cobranca da entrega"
            >
              {([
                ['fixo', 'Taxa unica', 'O mesmo valor para toda entrega'],
                ['km', 'Por distancia', 'Base + valor por quilometro'],
              ] as const).map(([valor, titulo, desc]) => {
                const ativo = texto('entrega_modo') === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => set('entrega_modo', valor)}
                    className={cn(
                      'press flex flex-col items-start gap-0.5 rounded-xl border-2 p-3 text-left transition-colors',
                      ativo ? 'border-primary bg-primary/8' : 'border-border',
                    )}
                  >
                    <span className="text-sm font-bold text-foreground">{titulo}</span>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-foreground">Tempo mín. (min)</span>
              <CampoNumero min="0"
                value={numero('tempo_min')}
                onChange={(v) => set('tempo_min', v)}
                className={campo}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-foreground">Tempo máx. (min)</span>
              <CampoNumero min="0"
                value={numero('tempo_max')}
                onChange={(v) => set('tempo_max', v)}
                className={campo}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-foreground">
                {porKm ? 'Taxa de reserva' : 'Taxa de entrega'}
              </span>
              <CampoNumero step="0.01" min="0"
                value={numero('taxa_entrega')}
                onChange={(v) => set('taxa_entrega', v)}
                className={campo}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-foreground">Pedido mínimo</span>
              <CampoNumero step="0.01" min="0"
                value={numero('pedido_minimo')}
                onChange={(v) => set('pedido_minimo', v)}
                className={campo}
              />
            </label>
          </div>


          {porKm && (
            <div className="animate-slide-down space-y-3 rounded-xl bg-muted/50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-bold text-foreground">Valor base</span>
                  <CampoNumero step="0.01" min="0"
                    value={numero('taxa_base')}
                    onChange={(v) => set('taxa_base', v)}
                    className={campo}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-bold text-foreground">Por km</span>
                  <CampoNumero step="0.01" min="0"
                    value={numero('taxa_por_km')}
                    onChange={(v) => set('taxa_por_km', v)}
                    className={campo}
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-bold text-foreground">
                  Raio maximo (km)
                </span>
                <CampoNumero step="0.5" min="0"
                  value={
                    form.raio_maximo_km === null || form.raio_maximo_km === undefined
                      ? ''
                      : numero('raio_maximo_km')
                  }
                  onChange={(v) =>
                    set('raio_maximo_km', v === '' ? null : v)
                  }
                  placeholder="Vazio = sem limite"
                  className={campo}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  Pedidos alem deste raio sao recusados pelo servidor.
                </span>
              </label>

              {/* Simulacao: ver o efeito antes de salvar evita descobrir o
                  preco errado com o cliente na linha. */}
              <div className="rounded-lg bg-card p-3">
                <p className="mb-1 text-xs font-bold text-foreground">Simulacao</p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {[1, 3, 5, 10].map((km) => {
                    const limite = form.raio_maximo_km as number | null | undefined;
                    const fora =
                      limite !== null && limite !== undefined && km > Number(limite);
                    return (
                      <li key={km} className="flex justify-between tabular-nums">
                        <span>{km} km</span>
                        <span
                          className={
                            fora ? 'text-destructive' : 'font-semibold text-foreground'
                          }
                        >
                          {fora
                            ? 'fora de area'
                            : formatPrice(
                                numero('taxa_base') + numero('taxa_por_km') * km,
                              )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  Distancia em linha reta. O trajeto de rua costuma ser 20 a 40%
                  maior; considere isso ao definir o valor por quilometro.
                </p>
              </div>

              {(form.lat === null || form.lat === undefined) && (
                <p role="alert" className="text-xs font-semibold text-destructive">
                  Marque o local da loja no mapa acima. Sem coordenada o calculo
                  por quilometro nao funciona e a taxa de reserva e usada.
                </p>
              )}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-bold text-foreground">Taxa de serviço (%)</span>
            <CampoNumero step="0.1" min="0" max="100"
              value={(numero('taxa_servico') * 100).toFixed(1)}
              onChange={(v) => set('taxa_servico', v / 100)}
              className={campo}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Zero remove a linha do resumo do cliente.
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
