import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { CampoImagem } from '@/components/admin/CampoImagem';
import { Pill } from '@/components/base/primitives';
import {
  alternarProduto,
  definirGruposDoProduto,
  gruposDoProduto,
  listarCategorias,
  listarGrupos,
  listarProdutos,
  removerProduto,
  salvarProduto,
  type ProdutoAdmin,
} from '@/lib/admin-api';
import { CATALOG_KEY } from '@/data/catalog';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const vazio = (categoriaId: string, ordem: number): ProdutoAdmin => ({
  slug: '',
  nome: '',
  descricao: '',
  preco: 0,
  image_url: '',
  category_id: categoriaId,
  destaque: false,
  esgotado: false,
  ordem,
  ativo: true,
});

/** Sugere o slug a partir do nome, sem impedir edição manual. */
const sugerirSlug = (nome: string) =>
  nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

const Products = () => {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<ProdutoAdmin | null>(null);
  const [gruposSelecionados, setGruposSelecionados] = useState<string[]>([]);

  const produtos = useQuery({ queryKey: ['admin', 'produtos'], queryFn: listarProdutos });
  const categorias = useQuery({ queryKey: ['admin', 'categorias'], queryFn: listarCategorias });
  const grupos = useQuery({ queryKey: ['admin', 'grupos'], queryFn: listarGrupos });

  // Ao abrir um produto existente, traz os grupos que ele já usa.
  useEffect(() => {
    if (editando?.id) gruposDoProduto(editando.id).then(setGruposSelecionados);
    else setGruposSelecionados([]);
  }, [editando?.id]);

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'produtos'] });
    // O cliente precisa ver a mudança sem recarregar.
    qc.invalidateQueries({ queryKey: CATALOG_KEY });
  };

  const salvar = useMutation({
    mutationFn: async (p: ProdutoAdmin) => {
      await salvarProduto(p);
      // Produto novo não tem id ainda; relê para achar o registro criado.
      const id =
        p.id ??
        (await listarProdutos()).find((x) => x.slug === p.slug)?.id;
      if (id) await definirGruposDoProduto(id, gruposSelecionados);
    },
    onSuccess: () => {
      invalidar();
      setEditando(null);
      toast.success('Produto salvo');
    },
    onError: (e: Error) => toast.error('Não foi possível salvar', { description: e.message }),
  });

  const alternar = useMutation({
    mutationFn: ({ id, campo, valor }: { id: string; campo: 'esgotado' | 'destaque' | 'ativo'; valor: boolean }) =>
      alternarProduto(id, campo, valor),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error('Não foi possível alterar', { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: removerProduto,
    onSuccess: () => {
      invalidar();
      toast.success('Produto removido');
    },
    onError: (e: Error) =>
      toast.error('Não foi possível remover', {
        description: e.message.includes('foreign key')
          ? 'Este produto já aparece em pedidos. Desative em vez de excluir.'
          : e.message,
      }),
  });

  const campo =
    'h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-foreground focus:border-ring focus:outline-none';

  if (editando) {
    return (
      <AdminShell>
        <h1 className="mb-4 text-lg font-black text-foreground">
          {editando.id ? 'Editar produto' : 'Novo produto'}
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate(editando);
          }}
          className="space-y-4"
        >
          <CampoImagem
            valor={editando.image_url}
            onChange={(image_url) => setEditando({ ...editando, image_url })}
          />

          <div>
            <label htmlFor="nome" className="mb-1 block text-sm font-bold text-foreground">Nome</label>
            <input
              id="nome"
              required
              value={editando.nome}
              onChange={(e) =>
                setEditando({
                  ...editando,
                  nome: e.target.value,
                  slug: editando.id ? editando.slug : sugerirSlug(e.target.value),
                })
              }
              className={campo}
            />
          </div>

          <div>
            <label htmlFor="descricao" className="mb-1 block text-sm font-bold text-foreground">Descrição</label>
            <textarea
              id="descricao"
              rows={3}
              value={editando.descricao}
              onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
              className="w-full resize-none rounded-xl border-2 border-border bg-card p-3 text-foreground focus:border-ring focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="preco" className="mb-1 block text-sm font-bold text-foreground">Preço</label>
              <input
                id="preco"
                type="number"
                step="0.01"
                min="0"
                required
                value={editando.preco}
                onChange={(e) => setEditando({ ...editando, preco: Number(e.target.value) })}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="categoria" className="mb-1 block text-sm font-bold text-foreground">Categoria</label>
              <select
                id="categoria"
                value={editando.category_id}
                onChange={(e) => setEditando({ ...editando, category_id: e.target.value })}
                className={campo}
              >
                {(categorias.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.rotulo}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="slug" className="mb-1 block text-sm font-bold text-foreground">
              Identificador
            </label>
            <input
              id="slug"
              required
              value={editando.slug}
              onChange={(e) => setEditando({ ...editando, slug: sugerirSlug(e.target.value) })}
              className={campo}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Aparece na URL do produto. Mudar quebra links já compartilhados.
            </p>
          </div>

          <fieldset className="surface p-4">
            <legend className="text-sm font-bold text-foreground">Personalização</legend>
            <p className="mb-3 text-xs text-muted-foreground">
              Quais grupos de opções este produto usa.
            </p>
            <div className="space-y-2">
              {(grupos.data ?? []).map((g) => {
                const marcado = gruposSelecionados.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      setGruposSelecionados((a) =>
                        marcado ? a.filter((x) => x !== g.id) : [...a, g.id],
                      )
                    }
                    className={cn(
                      'press-sm flex min-h-11 w-full items-center gap-3 rounded-xl border-2 px-3 text-left',
                      marcado ? 'border-primary bg-primary/8' : 'border-border',
                    )}
                  >
                    <span className="flex-1 text-sm text-foreground">{g.nome}</span>
                    {g.min_opcoes > 0 && <Pill tone="required">Obrigatório</Pill>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvar.isPending}
              className="press h-12 flex-1 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
            >
              {salvar.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => setEditando(null)}
              className="press-sm h-12 rounded-xl border-2 border-border px-5 font-bold text-foreground"
            >
              Cancelar
            </button>
          </div>
        </form>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-black text-foreground">Produtos</h1>
        <button
          type="button"
          onClick={() =>
            setEditando(
              vazio(categorias.data?.[0]?.id ?? '', (produtos.data?.length ?? 0) + 1),
            )
          }
          disabled={!categorias.data?.length}
          className="press flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo
        </button>
      </div>

      {produtos.isPending && <p className="py-10 text-center text-muted-foreground">Carregando...</p>}

      <div className="space-y-2">
        {(produtos.data ?? []).map((p) => (
          <div key={p.id} className={cn('surface p-3', !p.ativo && 'opacity-50')}>
            <div className="flex items-start gap-3">
              <img
                src={p.image_url}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg bg-muted object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{p.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {p.categories?.rotulo} · {formatPrice(Number(p.preco))}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.destaque && <Pill tone="offer">Destaque</Pill>}
                  {p.esgotado && <Pill tone="neutral">Esgotado</Pill>}
                  {!p.ativo && <Pill tone="neutral">Inativo</Pill>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditando(p as unknown as ProdutoAdmin)}
                aria-label={`Editar ${p.nome}`}
                className="press-sm tap-target flex items-center justify-center rounded-full text-muted-foreground"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
              {([
                ['esgotado', p.esgotado, 'Esgotado'],
                ['destaque', p.destaque, 'Destaque'],
                ['ativo', p.ativo, 'Ativo'],
              ] as const).map(([campoNome, valor, rotulo]) => (
                <button
                  key={campoNome}
                  type="button"
                  onClick={() =>
                    alternar.mutate({ id: p.id, campo: campoNome, valor: !valor })
                  }
                  className={cn(
                    'press-sm h-11 rounded-lg px-3 text-xs font-bold',
                    valor ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {rotulo}: {valor ? 'sim' : 'não'}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Remover "${p.nome}" do cardápio?`)) excluir.mutate(p.id);
                }}
                aria-label={`Remover ${p.nome}`}
                className="press-sm ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-destructive"
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

export default Products;
