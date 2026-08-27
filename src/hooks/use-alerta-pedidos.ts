import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { somPedidoNovo, prepararSom } from '@/lib/som';

const CHAVE_SOM = 'houseburger:admin:som';

/**
 * Alerta de pedido novo para a cozinha.
 *
 * Duas fontes, de propósito:
 *
 * 1. Assinatura em tempo real do Supabase, que avisa no instante do pedido.
 *    Aqui ela sai de graça — o supabase-js completo já está no pacote do admin.
 * 2. Contagem periódica a cada 15s, como rede de segurança. WebSocket cai em
 *    rede instável, e uma cozinha não pode perder pedido por causa disso.
 *
 * "Em aberto" é apenas o status `pendente`: a fila do que ainda não foi
 * aceito. Assim que a cozinha marca "preparando", sai da conta.
 */
export const useAlertaPedidos = () => {
  const qc = useQueryClient();
  const [somLigado, setSomLigado] = useState(() => {
    try {
      return window.localStorage.getItem(CHAVE_SOM) !== 'off';
    } catch {
      return true;
    }
  });

  const anterior = useRef<number | null>(null);

  const { data: pendentes = 0 } = useQuery({
    queryKey: ['admin', 'pendentes'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente');
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const alternarSom = useCallback(() => {
    setSomLigado((v) => {
      const novo = !v;
      try {
        window.localStorage.setItem(CHAVE_SOM, novo ? 'on' : 'off');
      } catch {
        /* sem persistência, mas vale para esta sessão */
      }
      // O clique que liga o som é o gesto que o navegador exige.
      if (novo) prepararSom();
      return novo;
    });
  }, []);

  const avisar = useCallback(
    (quantos: number) => {
      if (somLigado) somPedidoNovo();

      // Notificação do sistema só se o dono já autorizou. Pedir permissão
      // sozinho, sem contexto, é o caminho mais rápido para o "bloquear
      // sempre" — a permissão é solicitada por botão em AdminShell.
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('Pedido novo no House Burger', {
            body: quantos === 1 ? '1 pedido aguardando' : `${quantos} pedidos aguardando`,
            tag: 'pedido-novo',
          });
        } catch {
          /* alguns navegadores exigem service worker; o som já avisou */
        }
      }
    },
    [somLigado],
  );

  // Dispara quando a contagem SOBE. Ignora a primeira leitura, senão abrir o
  // painel com pedidos na fila tocaria o alerta sem nada ter chegado.
  useEffect(() => {
    if (anterior.current !== null && pendentes > anterior.current) {
      avisar(pendentes);
    }
    anterior.current = pendentes;
  }, [pendentes, avisar]);

  useEffect(() => {
    const canal = supabase
      .channel('pedidos-novos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => {
          // Não confia no payload: refaz a contagem, que é a fonte de verdade
          // e já respeita as permissões.
          qc.invalidateQueries({ queryKey: ['admin', 'pendentes'] });
          qc.invalidateQueries({ queryKey: ['admin', 'pedidos'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [qc]);

  return { pendentes, somLigado, alternarSom };
};
