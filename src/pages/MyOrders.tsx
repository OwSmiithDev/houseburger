import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ReceiptText, Trash2 } from 'lucide-react';
import { AppBar } from '@/components/base/AppBar';
import { SectionCard } from '@/components/base/primitives';
import { formatPrice } from '@/lib/format';
import { lerHistorico, limparHistorico, type PedidoNoHistorico } from '@/lib/historico';

const quando = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hoje = new Date();
  const mesmoDia =
    d.getDate() === hoje.getDate() &&
    d.getMonth() === hoje.getMonth() &&
    d.getFullYear() === hoje.getFullYear();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (mesmoDia) return `Hoje, ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hora}`;
};

const Linha = ({ p }: { p: PedidoNoHistorico }) => (
  <Link
    to={`/pedido/${p.token}`}
    className="press-sm flex items-center gap-3 p-4 text-left"
  >
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="text-sm font-black text-foreground">
          {p.codigo || 'Pedido'}
        </span>
        {!p.finalizado && (
          <span className="rounded-full bg-info px-2 py-0.5 text-[11px] font-bold text-info-foreground">
            Em andamento
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-xs text-muted-foreground">
        {quando(p.criadoEm)}
        {p.itens > 0 && ` · ${p.itens} ${p.itens === 1 ? 'item' : 'itens'}`}
        {` · ${p.tipoEntrega === 'delivery' ? 'Entrega' : 'Retirada'}`}
      </span>
    </span>
    {p.total > 0 && (
      <span className="shrink-0 font-extrabold tabular-nums text-foreground">
        {formatPrice(p.total)}
      </span>
    )}
    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
  </Link>
);

/**
 * Pedidos anteriores, lidos do próprio aparelho.
 *
 * Sem login não há como o servidor saber quem é quem, então a lista mora no
 * navegador. Trocar de aparelho ou limpar os dados do site apaga o histórico
 * daqui — o registro do que foi vendido continua inteiro no painel da loja.
 *
 * A lista é lida uma vez, no estado inicial: `localStorage` não avisa quando
 * muda, e reler a cada quadro só gastaria trabalho.
 */
const MyOrders = () => {
  const [pedidos, setPedidos] = useState<PedidoNoHistorico[]>(() => lerHistorico());
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="min-h-dvh bg-background pb-8">
      <AppBar title="Meus pedidos" subtitle="Guardados neste aparelho" />

      <div className="space-y-3 p-4">
        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <ReceiptText
              className="mb-4 h-14 w-14 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="text-lg font-bold text-foreground">Nenhum pedido ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os pedidos que você fizer neste aparelho aparecem aqui.
            </p>
            <Link
              to="/"
              className="press mt-6 flex h-12 items-center rounded-xl bg-primary px-6 font-bold text-primary-foreground"
            >
              Ver cardápio
            </Link>
          </div>
        ) : (
          <>
            <SectionCard className="divide-y divide-border p-0">
              {pedidos.map((p) => (
                <Linha key={p.token} p={p} />
              ))}
            </SectionCard>

            <p className="px-1 text-xs text-muted-foreground">
              Esta lista fica só neste aparelho. Limpar os dados do site apaga o
              histórico daqui, mas não cancela nenhum pedido.
            </p>

            {confirmando ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    limparHistorico();
                    setPedidos([]);
                    setConfirmando(false);
                  }}
                  className="press-sm min-h-12 flex-1 rounded-xl bg-destructive text-sm font-bold text-destructive-foreground"
                >
                  Apagar histórico
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="press-sm min-h-12 flex-1 rounded-xl border-2 border-border text-sm font-bold text-foreground"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="press-sm flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-border text-sm font-bold text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Limpar histórico
              </button>
            )}
          </>
        )}

        <Link
          to="/"
          className="press-sm flex min-h-12 items-center justify-center rounded-xl text-sm font-bold text-primary"
        >
          Voltar ao cardápio
        </Link>
      </div>
    </div>
  );
};

export default MyOrders;
