import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import {
  ClipboardList,
  LayoutDashboard,
  ListTree,
  LogOut,
  Store,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const secoes = [
  { to: '/admin', label: 'Início', icon: LayoutDashboard, fim: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/admin/produtos', label: 'Produtos', icon: UtensilsCrossed },
  { to: '/admin/grupos', label: 'Opções', icon: ListTree },
  { to: '/admin/cupons', label: 'Cupons', icon: Tag },
  { to: '/admin/loja', label: 'Loja', icon: Store },
];

/**
 * Guarda de sessão do admin.
 *
 * A verificação aqui é conveniência de navegação, não segurança: quem impede
 * escrita sem sessão é o RLS no banco. Forçar a rota mostra telas vazias e
 * qualquer gravação é recusada pelo servidor.
 */
export const AdminShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });

    // Expiração ou logout em outra aba tira o dono daqui na hora.
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

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-card pt-safe">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="gradient-hero flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black text-primary-foreground">
            HB
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Administração</p>
            <p className="truncate text-xs text-muted-foreground">
              {sessao.user.email}
            </p>
          </div>
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

      <main className="px-4 py-4">{children}</main>

      {/* Navegação fixa: no celular o dono opera com uma mão, igual ao cliente. */}
      <nav
        aria-label="Seções da administração"
        className="shadow-bar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-safe"
      >
        <ul className="no-scrollbar flex overflow-x-auto">
          {secoes.map(({ to, label, icon: Icone, fim }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={fim}
                className={({ isActive }) =>
                  cn(
                    'press-sm flex min-w-16 flex-col items-center gap-1 px-2 py-2 text-[11px] font-semibold',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <Icone className="h-5 w-5" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
