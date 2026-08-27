import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Switch } from '@/components/base/Switch';
import { CampoNumero } from '@/components/base/CampoNumero';
import {
  contarProdutosPorCategoria,
  listarCategorias,
  removerCategoria,
  salvarCategoria,
} from '@/lib/admin-api';
import { iconePorNome, nomesDeIcone } from '@/types/order';
import { cn } from '@/lib/utils';

const campo =
  'h-11 w-full rounded-lg border-2 border-border bg-card px-3 text-sm text-foreground';

interface Categoria {
  id: string;
  slug: string;
  rotulo: string;
  icone: string;
  ordem: number;
  ativa: boolean;
}

/**
 * Slug a partir do rótulo: minúsculas, sem acento, hífen no lugar de espaço.
 *
 * É o que vai na URL do cardápio, então não pode carregar acento nem espaço.
 */
const slugificar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const EscolherIcone = ({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (v: string) => void;
}) => (
  <div
    role="radiogroup"
    aria-label="Ícone da categoria"
    className="grid grid-cols-8 gap-1 rounded-lg border-2 border-border p-2 sm:grid-cols-10"
  >
    {nomesDeIcone.map((nome) => {
      const Icone = iconePorNome(nome);
      const marcado = nome === valor;
      return (
        <button
          key={nome}
          type="button"
          role="radio"
          aria-checked={marcado}
          aria-label={nome}
          onClick={() => onChange(nome)}
          className={cn(
            'press-sm flex h-10 items-center justify-center rounded-md',
            marcado ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
          )}
        >
          <Icone className="h-5 w-5" aria-hidden="true" />
        </button>
      );
    })}
  </div>
);

/**
 * Formulário de criar/editar, fora do componente de lista de propósito.
 *
 * Definido lá dentro, ele seria recriado a cada renderização da lista — e como
 * guarda o rascunho em estado local, qualquer atualização de consulta em
 * segundo plano apagaria o que estivesse sendo digitado.
 */
const Formulario = ({
inicial,
ordemPadrao,
salvando,
onSalvar,
onFechar,
}: {
inicial: Categoria | null;
ordemPadrao: number;
salvando: boolean;
onSalvar: (c: Categoria & { id?: string }) => void;
onFechar: () => void;
}) => {
  const [rascunho, setRascunho] = useState<Categoria>(
    inicial ?? {
      id: '',
      slug: '',
      rotulo: '',
      icone: 'UtensilsCrossed',
      ordem: ordemPadrao,
      ativa: true,
    },
  );
  const novo = !inicial;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const slug = rascunho.slug.trim() || slugificar(rascunho.rotulo);
        if (!slug) {
          toast.error('Dê um nome à categoria');
          return;
        }
        onSalvar({ ...rascunho, slug, id: rascunho.id || undefined });
      }}
      className="surface mb-3 space-y-3 p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">
          {novo ? 'Nova categoria' : `Editar ${inicial.rotulo}`}
        </h2>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="press-sm tap-target flex items-center justify-center rounded-full text-muted-foreground"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-bold text-foreground">Nome</span>
        <input
          required
          autoFocus
          value={rascunho.rotulo}
          onChange={(e) => {
            const rotulo = e.target.value;
            setRascunho((r) => ({
              ...r,
              rotulo,
              // Enquanto é nova, o slug acompanha o nome. Depois de criada
              // ele congela: mudá-lo quebraria o link que o cliente já tem.
              slug: novo ? slugificar(rotulo) : r.slug,
            }));
          }}
          placeholder="Pizzas, Bebidas, Sobremesas..."
          className={campo}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-bold text-foreground">
          Endereço na loja {!novo && <span className="font-normal text-muted-foreground">(fixo)</span>}
        </span>
        <input
          value={rascunho.slug}
          onChange={(e) => setRascunho((r) => ({ ...r, slug: slugificar(e.target.value) }))}
          disabled={!novo}
          className={cn(campo, !novo && 'bg-muted text-muted-foreground')}
        />
      </label>

      <div className="text-sm">
        <span className="mb-1 block font-bold text-foreground">Ícone</span>
        <EscolherIcone
          valor={rascunho.icone}
          onChange={(icone) => setRascunho((r) => ({ ...r, icone }))}
        />
      </div>

      <div className="flex items-end gap-4">
        <label className="block text-sm">
          <span className="mb-1 block font-bold text-foreground">Ordem</span>
          <CampoNumero
            min={0}
            value={rascunho.ordem}
            onChange={(ordem) => setRascunho((r) => ({ ...r, ordem }))}
            className={cn(campo, 'w-24')}
          />
        </label>
        <Switch
          checked={rascunho.ativa}
          onCheckedChange={(ativa) => setRascunho((r) => ({ ...r, ativa }))}
          label="Ativa"
        />
      </div>

      <button
        type="submit"
        disabled={salvando}
        className="press h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
      >
        {salvando ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
};

/**
 * Gestão de categorias.
 *
 * Existe porque o sistema é instalado para lojas de nichos diferentes: uma
 * pizzaria não vende "Hambúrgueres", e até então trocar isso exigia mexer no
 * banco na mão.
 */
const Categories = () => {
  const qc = useQueryClient();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);

  const categorias = useQuery({ queryKey: ['admin', 'categorias'], queryFn: listarCategorias });
  const contagem = useQuery({
    queryKey: ['admin', 'categorias', 'contagem'],
    queryFn: contarProdutosPorCategoria,
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'categorias'] });
    // O cardápio do cliente lê as mesmas categorias.
    qc.invalidateQueries({ queryKey: ['catalog'] });
  };
  const erro = (e: Error) => toast.error('Não foi possível salvar', { description: e.message });

  const salvar = useMutation({
    mutationFn: salvarCategoria,
    onSuccess: () => {
      invalidar();
      setCriando(false);
      setEditando(null);
      toast.success('Categoria salva');
    },
    onError: erro,
  });

  const excluir = useMutation({
    mutationFn: removerCategoria,
    onSuccess: () => {
      invalidar();
      toast.success('Categoria removida');
    },
    onError: erro,
  });

  const lista = (categorias.data ?? []) as Categoria[];

  /** Troca a ordem com o vizinho e grava as duas. */
  const mover = (i: number, direcao: -1 | 1) => {
    const atual = lista[i];
    const vizinho = lista[i + direcao];
    if (!atual || !vizinho) return;
    salvar.mutate({ ...atual, ordem: vizinho.ordem });
    salvar.mutate({ ...vizinho, ordem: atual.ordem });
  };

  const tentarExcluir = (c: Categoria) => {
    const usos = contagem.data?.get(c.id) ?? 0;
    if (usos > 0) {
      toast.error('Categoria em uso', {
        description: `${usos} ${usos === 1 ? 'produto usa' : 'produtos usam'} "${c.rotulo}". ` +
          'Mova-os para outra categoria, ou desative esta em vez de excluir.',
      });
      return;
    }
    if (confirm(`Remover a categoria "${c.rotulo}"?`)) excluir.mutate(c.id);
  };

  return (
    <AdminShell>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-black text-foreground">Categorias</h1>
        {!criando && !editando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="press flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova
          </button>
        )}
      </div>

      {(criando || editando) && (
        <Formulario
          key={editando?.id ?? 'nova'}
          inicial={editando}
          ordemPadrao={lista.length}
          salvando={salvar.isPending}
          onSalvar={(c) => salvar.mutate(c)}
          onFechar={() => {
            setCriando(false);
            setEditando(null);
          }}
        />
      )}

      {categorias.isPending && (
        <p className="py-10 text-center text-muted-foreground">Carregando...</p>
      )}

      {!categorias.isPending && lista.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">
          Nenhuma categoria ainda. Crie a primeira para organizar o cardápio.
        </p>
      )}

      <div className="space-y-2">
        {lista.map((c, i) => {
          const Icone = iconePorNome(c.icone);
          const usos = contagem.data?.get(c.id) ?? 0;
          return (
            <div
              key={c.id}
              className={cn('surface flex items-center gap-3 p-3', !c.ativa && 'opacity-50')}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <Icone className="h-5 w-5" aria-hidden="true" />
              </span>

              <button
                type="button"
                onClick={() => {
                  setCriando(false);
                  setEditando(c);
                }}
                className="press-sm min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-bold text-foreground">{c.rotulo}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  /{c.slug} · {usos} {usos === 1 ? 'produto' : 'produtos'}
                  {!c.ativa && ' · inativa'}
                </span>
              </button>

              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  aria-label={`Subir ${c.rotulo}`}
                  className="press-sm flex h-6 w-8 items-center justify-center text-muted-foreground disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, 1)}
                  disabled={i === lista.length - 1}
                  aria-label={`Descer ${c.rotulo}`}
                  className="press-sm flex h-6 w-8 items-center justify-center text-muted-foreground disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <Switch
                checked={c.ativa}
                onCheckedChange={(ativa) => salvar.mutate({ ...c, ativa })}
                label=""
                aria-label={`${c.ativa ? 'Desativar' : 'Ativar'} ${c.rotulo}`}
                className="shrink-0"
              />

              <button
                type="button"
                onClick={() => tentarExcluir(c)}
                aria-label={`Remover ${c.rotulo}`}
                className="press-sm tap-target flex shrink-0 items-center justify-center rounded-full text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Categoria desativada some do cardápio, e os produtos dela junto — sem
        apagar nada. Para excluir de vez, a categoria precisa estar vazia.
      </p>
    </AdminShell>
  );
};

export default Categories;
