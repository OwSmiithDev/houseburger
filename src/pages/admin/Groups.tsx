import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { Pill } from '@/components/base/primitives';
import {
  listarGrupos,
  removerGrupo,
  removerOpcao,
  salvarGrupo,
  salvarOpcao,
} from '@/lib/admin-api';
import { CATALOG_KEY } from '@/data/catalog';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

const campo =
  'h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-foreground focus:border-ring focus:outline-none';

const Groups = () => {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState<string | null>(null);
  const [novoGrupo, setNovoGrupo] = useState(false);
  const [rascunho, setRascunho] = useState({ nome: '', min_opcoes: 0, max_opcoes: 1 });

  const grupos = useQuery({ queryKey: ['admin', 'grupos'], queryFn: listarGrupos });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'grupos'] });
    qc.invalidateQueries({ queryKey: CATALOG_KEY });
  };

  const erro = (e: Error) => toast.error('Não foi possível salvar', { description: e.message });

  const grupoMut = useMutation({ mutationFn: salvarGrupo, onSuccess: invalidar, onError: erro });
  const opcaoMut = useMutation({ mutationFn: salvarOpcao, onSuccess: invalidar, onError: erro });
  const apagarGrupo = useMutation({ mutationFn: removerGrupo, onSuccess: invalidar, onError: erro });
  const apagarOpcao = useMutation({ mutationFn: removerOpcao, onSuccess: invalidar, onError: erro });

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-black text-foreground">Grupos de opções</h1>
        <button
          type="button"
          onClick={() => setNovoGrupo((v) => !v)}
          className="press flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo
        </button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Mínimo 1 torna o grupo obrigatório: o cliente não fecha o pedido sem
        escolher. Máximo 1 vira escolha única; acima disso, o cliente pode somar
        várias opções.
      </p>

      {novoGrupo && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            grupoMut.mutate(
              {
                slug: slugify(rascunho.nome),
                nome: rascunho.nome,
                min_opcoes: rascunho.min_opcoes,
                max_opcoes: Math.max(rascunho.max_opcoes, rascunho.min_opcoes || 1),
                ordem: (grupos.data?.length ?? 0) + 1,
              },
              {
                onSuccess: () => {
                  setNovoGrupo(false);
                  setRascunho({ nome: '', min_opcoes: 0, max_opcoes: 1 });
                  toast.success('Grupo criado');
                },
              },
            );
          }}
          className="surface animate-slide-down mb-4 space-y-3 p-4"
        >
          <input
            required
            placeholder="Nome do grupo (ex.: Escolha o pão)"
            value={rascunho.nome}
            onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
            className={campo}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-bold text-foreground">Mínimo</span>
              <input
                type="number"
                min={0}
                value={rascunho.min_opcoes}
                onChange={(e) => setRascunho({ ...rascunho, min_opcoes: Number(e.target.value) })}
                className={campo}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-bold text-foreground">Máximo</span>
              <input
                type="number"
                min={1}
                value={rascunho.max_opcoes}
                onChange={(e) => setRascunho({ ...rascunho, max_opcoes: Number(e.target.value) })}
                className={campo}
              />
            </label>
          </div>
          <button
            type="submit"
            className="press h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground"
          >
            Criar grupo
          </button>
        </form>
      )}

      <div className="grid gap-2 md:grid-cols-2 md:items-start">
        {(grupos.data ?? []).map((g) => {
          const expandido = aberto === g.id;
          return (
            <div key={g.id} className="surface overflow-hidden">
              <button
                type="button"
                onClick={() => setAberto(expandido ? null : g.id)}
                aria-expanded={expandido}
                className="press-sm flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">{g.nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    {g.option_items.length} opções · mín {g.min_opcoes} · máx {g.max_opcoes}
                  </span>
                </span>
                {g.min_opcoes > 0 && <Pill tone="required">Obrigatório</Pill>}
                <ChevronDown
                  className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', expandido && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>

              {expandido && (
                <div className="animate-slide-down border-t border-border p-4">
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <label className="text-sm">
                      <span className="mb-1 block font-bold text-foreground">Mínimo</span>
                      <input
                        type="number"
                        min={0}
                        defaultValue={g.min_opcoes}
                        onBlur={(e) =>
                          grupoMut.mutate({ ...g, min_opcoes: Number(e.target.value) })
                        }
                        className={campo}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-bold text-foreground">Máximo</span>
                      <input
                        type="number"
                        min={1}
                        defaultValue={g.max_opcoes}
                        onBlur={(e) =>
                          grupoMut.mutate({ ...g, max_opcoes: Number(e.target.value) })
                        }
                        className={campo}
                      />
                    </label>
                  </div>

                  <ul className="space-y-2">
                    {g.option_items.map((o) => (
                      <li key={o.id} className="flex items-center gap-2">
                        <input
                          defaultValue={o.nome}
                          onBlur={(e) => opcaoMut.mutate({ ...o, nome: e.target.value })}
                          aria-label="Nome da opção"
                          className="h-11 min-w-0 flex-1 rounded-lg border-2 border-border bg-card px-2 text-sm text-foreground focus:border-ring focus:outline-none"
                        />
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={o.price_delta}
                          onBlur={(e) =>
                            opcaoMut.mutate({ ...o, price_delta: Number(e.target.value) })
                          }
                          aria-label={`Acréscimo de ${o.nome}`}
                          className="h-11 w-24 rounded-lg border-2 border-border bg-card px-2 text-sm tabular-nums text-foreground focus:border-ring focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => opcaoMut.mutate({ ...o, esgotado: !o.esgotado })}
                          className={cn(
                            'press-sm h-11 shrink-0 rounded-lg px-2 text-xs font-bold',
                            o.esgotado ? 'bg-muted text-muted-foreground' : 'bg-success/15 text-success',
                          )}
                        >
                          {o.esgotado ? 'Esgotado' : 'Ativo'}
                        </button>
                        <button
                          type="button"
                          onClick={() => apagarOpcao.mutate(o.id)}
                          aria-label={`Remover ${o.nome}`}
                          className="press-sm flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-destructive"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const nome = (form.elements.namedItem('nome') as HTMLInputElement).value;
                      const delta = Number(
                        (form.elements.namedItem('delta') as HTMLInputElement).value || 0,
                      );
                      opcaoMut.mutate(
                        {
                          group_id: g.id,
                          slug: slugify(nome),
                          nome,
                          price_delta: delta,
                          esgotado: false,
                          ordem: g.option_items.length + 1,
                        },
                        { onSuccess: () => form.reset() },
                      );
                    }}
                    className="mt-3 flex gap-2 border-t border-border pt-3"
                  >
                    <input
                      name="nome"
                      required
                      placeholder="Nova opção"
                      className="h-11 min-w-0 flex-1 rounded-lg border-2 border-border bg-card px-2 text-sm text-foreground focus:border-ring focus:outline-none"
                    />
                    <input
                      name="delta"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="h-11 w-24 rounded-lg border-2 border-border bg-card px-2 text-sm text-foreground focus:border-ring focus:outline-none"
                    />
                    <button
                      type="submit"
                      aria-label="Adicionar opção"
                      className="press-sm flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remover o grupo "${g.nome}" e todas as suas opções?`))
                        apagarGrupo.mutate(g.id);
                    }}
                    className="press-sm mt-3 h-11 w-full rounded-xl border-2 border-border text-sm font-bold text-destructive"
                  >
                    Remover grupo
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
};

export default Groups;
