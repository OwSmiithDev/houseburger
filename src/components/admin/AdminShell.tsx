import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import {
  Bell,
  BellOff,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  ListTree,
  LogOut,
  Store,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAlertaPedidos } from '@/hooks/use-alerta-pedidos';
import { cn } from '@/lib/utils';

const secoes = [
  { to: '/admin', label: 'Início', icon: LayoutDashboard, fim: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList, badge: true },
  { to: '/admin/relatorios', label: 'Relatórios', icon: ChartColumn },
  { to: '/admin/produtos', label: 'Produtos', icon: UtensilsCrossed },
  { to: '/admin/grupos', label: 'Opções', icon: ListTree },
  { to: '/admin/cupons', label: 'Cupons', icon: Tag },
  { to: '/admin/loja', label: 'Loja', icon: Store },
];

/**
 * Guarda de sessão e moldura do painel.
 *
 * A verificação de sessão aqui é conveniência de navegação, não segurança: quem
 * impede escrita sem sessão é o RLS no banco.
 *
 * Layout em dois modos. No celular, navegação inferior fixa como no aplicativo
 * do cliente. A partir de `md`, barra lateral fixa e conteúdo com largura
 * máxima — antes o painel era layout de celular esticado, com a navegação
 * colada na base de um monitor de 27 polegadas.
 */
export const AdminShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const { pendentes, somLigado, alternarSom } = useAlertaPedidos();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (carregando) {
    return (
      <div className="min-h-dvh bg-background" aria-busy="true">
        <span className="sr-only">Verificando acesso</span>
      </div>
    );
  }

  if (!sessao) return <Navigate to="/admin/login" replace />;

  const sair = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  const pedirNotificacoes = async () => {
    if (typeof Notification === 'undefined') return;
    await Notification.requestPermission();
  };

  const podePedirPermissao =
    typeof Notification !== 'undefined' && Notification.permission === 'default';

  const Badge = ({ n }: { n: number }) =>
    n > 0 ? (
      <span
        className="animate-pop flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground"
        aria-label={`${n} ${n === 1 ? 'pedido aguardando' : 'pedidos aguardando'}`}
      >
        {n > 99 ? '99+' : n}
      </span>
    ) : null;

  return (
    <div className="min-h-dvh bg-background md:flex">
      {/* Barra lateral, só a partir de md */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="gradient-hero flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black text-primary-foreground">
            HB
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Administração</p>
            <p className="truncate text-xs text-muted-foreground">{sessao.user.email}</p>
          </div>
        </div>

        <nav aria-label="Seções da administração" className="flex-1 p-2">
          <ul className="space-y-1">
            {secoes.map(({ to, label, icon: Icone, fim, badge }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={fim}
                  className={({ isActive }) =>
                    cn(
                      'press-sm flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted',
                    )
                  }
                >
                  <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  {badge && <Badge n={pendentes} />}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-1 border-t border-border p-2">
          <button
            type="button"
            onClick={alternarSom}
            className="press-sm flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground"
          >
            {somLigado ? (
              <Bell className="h-5 w-5" aria-hidden="true" />
            ) : (
              <BellOff className="h-5 w-5" aria-hidden="true" />
            )}
            Som {somLigado ? 'ligado' : 'desligado'}
          </button>
          <button
            type="button"
            onClick={sair}
            className="press-sm flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 md:pb-0">
        {/* Cabeçalho: some no desktop, onde a lateral já identifica a sessão */}
        <header className="sticky top-0 z-30 border-b border-border bg-card pt-safe md:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="gradient-hero flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black text-primary-foreground">
              HB
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Administração</p>
              <p className="truncate text-xs text-muted-foreground">{sessao.user.email}</p>
            </div>
            <button
              type="button"
              onClick={alternarSom}
              aria-label={somLigado ? 'Desligar som de alerta' : 'Ligar som de alerta'}
              className="press-sm tap-target flex items-center justify-center rounded-full text-muted-foreground"
            >
              {somLigado ? (
                <Bell className="h-5 w-5" aria-hidden="true" />
              ) : (
                <BellOff className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={sair}
              aria-label="Sair"
              className="press-sm tap-target flex items-center justify-center rounded-full text-muted-foreground"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {podePedirPermissao && (
          <button
            type="button"
            onClick={pedirNotificacoes}
            className="press flex w-full items-center gap-2 border-b border-info-border bg-info px-4 py-2 text-left text-sm font-semibold text-info-foreground"
          >
            <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              Ativar notificações do sistema para pedidos novos
            </span>
          </button>
        )}

        <main className="mx-auto w-full max-w-5xl px-4 py-4">{children}</main>
      </div>

      {/* Navegação inferior: só no celular */}
      <nav
        aria-label="Seções da administração"
        className="shadow-bar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-safe md:hidden"
      >
        <ul className="no-scrollbar flex overflow-x-auto">
          {secoes.map(({ to, label, icon: Icone, fim, badge }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={fim}
                className={({ isActive }) =>
                  cn(
                    'press-sm relative flex min-w-16 flex-col items-center gap-1 px-2 py-2 text-[11px] font-semibold',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <span className="relative">
                  <Icone className="h-5 w-5" aria-hidden="true" />
                  {badge && pendentes > 0 && (
                    <span className="absolute -right-2.5 -top-1.5">
                      <Badge n={pendentes} />
                    </span>
                  )}
                </span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
