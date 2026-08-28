import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Info, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { Switch } from '@/components/base/Switch';
import { CampoNumero } from '@/components/base/CampoNumero';
import { listarCupons, removerCupom, salvarCupom } from '@/lib/admin-api';
import { CATALOG_KEY } from '@/data/catalog';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const campo =
  'h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-foreground focus:border-ring focus:outline-none';

interface Cupom {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  valor: number;
  min_subtotal: number;
  ativo: boolean;
  expira_em: string | null;
}

const descreveRegra = (tipo: string, valor: number) => {
  if (tipo === 'percent') return `${Math.round(valor * 100)}% de desconto`;
  if (tipo === 'fixed') return `${formatPrice(valor)} de desconto`;
  return 'Entrega grátis';
};

const venceu = (iso: string | null) =>
  Boolean(iso) && new Date(iso as string).getTime() <= Date.now();

/**
 * `<input type="date">` fala `AAAA-MM-DD`; o banco guarda instante com fuso.
 *
 * A conversão de volta usa a data local, não `toISOString()`, que devolveria o
 * dia em UTC — no Brasil, um cupom que vence "dia 5" viraria dia 4 à noite.
 */
const paraCampoData = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

/** Vale até o fim do dia escolhido, não até a meia-noite que o abre. */
const paraBanco = (data: string) => {
  if (!data) return null;
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 23, 59, 59).toISOString();
};

const vazio: Cupom = {
  id: '',
  codigo: '',
  descricao: '',
  tipo: 'percent',
  valor: 10,
  min_subtotal: 0,
  ativo: true,
  expira_em: null,
};

/**
 * Formulário de criar e editar.
 *
 * Fora do componente de lista de propósito: definido dentro, seria recriado a
 * cada renderização e o rascunho se perderia sempre que uma consulta em
 * segundo plano terminasse.
 */
const Formulario = ({
  inicial,
  salvando,
  onSalvar,
  onFechar,
}: {
  inicial: Cupom | null;
  salvando: boolean;
  onSalvar: (c: Cupom) => void;
  onFechar: () => void;
}) => {
  const novo = !inicial;
  const [r, setR] = useState<Cupom>(() => {
    const base = inicial ?? vazio;
    // Percentual é guardado como fração e digitado como inteiro.
    return { ...base, valor: base.tipo === 'percent' ? base.valor * 100 : base.valor };
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const codigo = r.codigo.toUpperCase().trim();
        if (!codigo) {
          toast.error('Informe o código do cupom');
          return;
        }
        onSalvar({
          ...r,
          codigo,
          valor: r.tipo === 'percent' ? r.valor / 100 : r.tipo === 'shipping' ? 0 : r.valor,
        });
      }}
      className="surface animate-slide-down mb-4 space-y-3 p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">
          {novo ? 'Novo cupom' : `Editar ${inicial.codigo}`}
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
        <span className="mb-1 block font-bold text-foreground">Código</span>
        <input
          required
          value={r.codigo}
          onChange={(e) => setR({ ...r, codigo: e.target.value.toUpperCase() })}
          placeholder="BEMVINDO10"
          className={cn(campo, 'uppercase')}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-bold text-foreground">Descrição para o cliente</span>
        <input
          required
          value={r.descricao}
          onChange={(e) => setR({ ...r, descricao: e.target.value })}
          placeholder="10% de desconto na primeira compra"
          className={campo}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-bold text-foreground">Tipo</span>
        <select
          value={r.tipo}
          onChange={(e) => setR({ ...r, tipo: e.target.value })}
          className={campo}
        >
          <option value="percent">Percentual sobre o subtotal</option>
          <option value="fixed">Valor fixo em reais</option>
          <option value="shipping">Entrega grátis</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        {r.tipo !== 'shipping' && (
          <label className="text-sm">
            <span className="mb-1 block font-bold text-foreground">
              {r.tipo === 'percent' ? 'Percentual' : 'Valor'}
            </span>
            <CampoNumero
              step="0.01"
              min={0}
              value={r.valor}
              onChange={(valor) => setR({ ...r, valor })}
              className={campo}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {r.tipo === 'percent' ? 'Digite 10 para 10%' : 'Em reais'}
            </span>
          </label>
        )}
        <label className="text-sm">
          <span className="mb-1 block font-bold text-foreground">Subtotal mínimo</span>
          <CampoNumero
            step="0.01"
            min={0}
            value={r.min_subtotal}
            onChange={(min_subtotal) => setR({ ...r, min_subtotal })}
            className={campo}
          />
          <span className="mt-1 block text-xs text-muted-foreground">Zero = sem mínimo</span>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-bold text-foreground">Válido até</span>
        <input
          type="date"
          value={paraCampoData(r.expira_em)}
          onChange={(e) => setR({ ...r, expira_em: paraBanco(e.target.value) })}
          className={campo}
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          Em branco, o cupom não vence. Vale até o fim do dia escolhido.
        </span>
      </label>

      <Switch
        checked={r.ativo}
        onCheckedChange={(ativo) => setR({ ...r, ativo })}
        label="Cupom ativo"
      />

      <button
        type="submit"
        disabled={salvando}
        className="press h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
      >
        {salvando ? 'Salvando...' : novo ? 'Criar cupom' : 'Salvar alterações'}
      </button>
    </form>
  );
};

const Coupons = () => {
  const qc = useQueryClient();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Cupom | null>(null);

  const cupons = useQuery({ queryKey: ['admin', 'cupons'], queryFn: listarCupons });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'cupons'] });
    qc.invalidateQueries({ queryKey: CATALOG_KEY });
  };
  const erro = (e: Error) => toast.error('Não foi possível salvar', { description: e.message });

  const salvar = useMutation({
    mutationFn: salvarCupom,
    onSuccess: () => {
      invalidar();
      setCriando(false);
      setEditando(null);
    },
    onError: erro,
  });
  const excluir = useMutation({ mutationFn: removerCupom, onSuccess: invalidar, onError: erro });

  const lista = (cupons.data ?? []) as Cupom[];

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-black text-foreground">Cupons</h1>
        {!criando && !editando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="press flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo
          </button>
        )}
      </div>

      {/* O cliente valida o cupom no navegador; quem confere de verdade é a
          loja ao ler a comanda. Dizer isso evita confiança indevida. */}
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          O desconto é recalculado pelo servidor ao registrar o pedido, então o
          valor da comanda é sempre o correto — inclusive a validade, que o
          banco confere na hora. Ainda assim, confira o cupom aplicado antes de
          confirmar com o cliente.
        </p>
      </div>

      {(criando || editando) && (
        <Formulario
          key={editando?.id ?? 'novo'}
          inicial={editando}
          salvando={salvar.isPending}
          onSalvar={(c) =>
            salvar.mutate(
              { ...c, id: c.id || undefined },
              { onSuccess: () => toast.success(c.id ? 'Cupom salvo' : 'Cupom criado') },
            )
          }
          onFechar={() => {
            setCriando(false);
            setEditando(null);
          }}
        />
      )}

      <div className="grid gap-2 md:grid-cols-2">
        {lista.map((c) => {
          const vencido = venceu(c.expira_em);
          return (
            <div
              key={c.id}
              className={cn('surface p-4', (!c.ativo || vencido) && 'opacity-60')}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-black text-foreground">
                    {c.codigo}
                    {vencido && (
                      <span className="rounded-full bg-alerta px-2 py-0.5 text-[11px] font-bold text-alerta-foreground">
                        Vencido
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{c.descricao}</p>
                  <p className="mt-1 text-xs text-success">
                    {descreveRegra(c.tipo, Number(c.valor))}
                    {Number(c.min_subtotal) > 0 &&
                      ` · a partir de ${formatPrice(Number(c.min_subtotal))}`}
                  </p>
                  {c.expira_em && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3 w-3" aria-hidden="true" />
                      {vencido ? 'Venceu em' : 'Vale até'}{' '}
                      {new Date(c.expira_em).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCriando(false);
                      setEditando(c);
                    }}
                    aria-label={`Editar ${c.codigo}`}
                    className="press-sm tap-target flex items-center justify-center rounded-full text-muted-foreground"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remover o cupom ${c.codigo}?`)) excluir.mutate(c.id);
                    }}
                    aria-label={`Remover ${c.codigo}`}
                    className="press-sm tap-target flex items-center justify-center rounded-full text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-1 border-t border-border pt-1">
                <Switch
                  checked={c.ativo}
                  onCheckedChange={(ativo) => salvar.mutate({ ...c, ativo })}
                  label={c.ativo ? 'Ativo' : 'Inativo'}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
};

export default Coupons;
