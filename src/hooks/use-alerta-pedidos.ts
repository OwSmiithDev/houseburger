import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { destravarSomNoPrimeiroToque, somPedidoNovo, prepararSom } from '@/lib/som';

const CHAVE_SOM = 'houseburger:admin:som';

/** Varredura enquanto o tempo real não confirmar que está entregando eventos. */
const INTERVALO_SEM_TEMPO_REAL = 10_000;

/** Varredura de segurança quando o tempo real está de pé. */
const INTERVALO_COM_TEMPO_REAL = 30_000;

/** De quanto em quanto o alarme insiste enquanto houver pedido parado. */
const INTERVALO_ALARME = 15_000;

/**
 * Alerta de pedido novo para a cozinha.
 *
 * Duas fontes, de propósito:
 *
 * 1. Assinatura em tempo real do Supabase, que avisa no instante do pedido.
 *    Aqui ela sai de graça — o supabase-js completo já está no pacote do admin.
 * 2. Contagem periódica, como rede de segurança. WebSocket cai em rede
 *    instável, e uma cozinha não pode perder pedido por causa disso.
 *
 * O intervalo da varredura depende da primeira: 10s até o tempo real provar
 * que funciona, 30s depois disso. Antes era 30s fixo, e como o tempo real
 * nunca entregou nada (a tabela `orders` não estava na publicação
 * `supabase_realtime`), a lista demorava meio minuto para mostrar um pedido
 * pago.
 *
 * "Provar que funciona" é receber um evento de verdade — não o `subscribe`
 * dizer que deu certo. O servidor responde `phx_reply: ok` à assinatura e só
 * depois manda um `system` avisando "Unable to subscribe to changes", de modo
 * que o estado do canal fica `SUBSCRIBED` com a inscrição morta. Confiar nele
 * seria repetir o bug com mais código.
 *
 * "Em aberto" é apenas o status `pendente`: a fila do que ainda não foi
 * aceito. Assim que a cozinha marca "preparando", sai da conta.
 */
export const useAlertaPedidos = () => {
  const qc = useQueryClient();

  // Só o nome, e sem varredura: é para o título da notificação do sistema.
  const { data: nomeDaLoja } = useQuery({
    queryKey: ['admin', 'nome-da-loja'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('nome')
        .eq('id', 1)
        .single();
      if (error) throw new Error(error.message);
      return (data?.nome as string) ?? '';
    },
    staleTime: 10 * 60_000,
  });
  const [somLigado, setSomLigado] = useState(() => {
    try {
      return window.localStorage.getItem(CHAVE_SOM) !== 'off';
    } catch {
      return true;
    }
  });
  // Vira true no primeiro evento recebido, e só então a varredura desacelera.
  const [tempoRealAtivo, setTempoRealAtivo] = useState(false);

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
    refetchInterval: tempoRealAtivo ? INTERVALO_COM_TEMPO_REAL : INTERVALO_SEM_TEMPO_REAL,
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
          // O nome sai da configuração da loja: o mesmo sistema é instalado
          // para empresas diferentes, e estava fixo como "House Burger".
          new Notification(nomeDaLoja ? `Pedido novo · ${nomeDaLoja}` : 'Pedido novo', {
            body: quantos === 1 ? '1 pedido aguardando' : `${quantos} pedidos aguardando`,
            tag: 'pedido-novo',
          });
        } catch {
          /* alguns navegadores exigem service worker; o som já avisou */
        }
      }
    },
    [somLigado, nomeDaLoja],
  );

  // Dispara quando a contagem SOBE. Ignora a primeira leitura, senão abrir o
  // painel com pedidos na fila tocaria o alerta sem nada ter chegado.
  useEffect(() => {
    if (anterior.current !== null && pendentes > anterior.current) {
      avisar(pendentes);
    }
    anterior.current = pendentes;
  }, [pendentes, avisar]);

  /*
   * O alarme insiste enquanto houver pedido parado na fila.
   *
   * Tocar uma vez só não serve numa cozinha: quem estava montando um lanche de
   * costas para a tela perde o aviso e o pedido morre esperando. Aceitar o
   * pedido é o que silencia — não o tempo — para o alarme não virar ruído de
   * fundo que se aprende a ignorar. O interruptor de som desliga inclusive
   * esta repetição.
   */
  useEffect(() => {
    if (!somLigado || pendentes === 0) return;
    const id = window.setInterval(() => somPedidoNovo(), INTERVALO_ALARME);
    return () => window.clearInterval(id);
  }, [somLigado, pendentes]);

  // Sessão salva: quem recarrega o painel não clica em nada, e sem um gesto o
  // navegador mantém o áudio travado.
  useEffect(() => destravarSomNoPrimeiroToque(), []);

  useEffect(() => {
    const canal = supabase
      .channel('pedidos-novos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          // Chegou evento: o tempo real está mesmo entregando, e a varredura
          // pode desacelerar para o papel de rede de segurança.
          setTempoRealAtivo(true);
          // Não confia no payload: refaz a contagem, que é a fonte de verdade
          // e já respeita as permissões.
          qc.invalidateQueries({ queryKey: ['admin', 'pendentes'] });
          qc.invalidateQueries({ queryKey: ['admin', 'pedidos'] });
        },
      )
      // O status serve só para diagnóstico no console: ele não distingue uma
      // inscrição viva de uma que o servidor recusou logo depois de aceitar.
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setTempoRealAtivo(false);
          console.warn(
            `[pedidos] canal de tempo real com problema (${status}); ` +
              'a varredura a cada 10s assume.',
          );
        }
      });

    return () => {
      setTempoRealAtivo(false);
      void supabase.removeChannel(canal);
    };
  }, [qc]);

  return { pendentes, somLigado, alternarSom, tempoRealAtivo };
};

export type AlertaPedidos = ReturnType<typeof useAlertaPedidos>;

/**
 * O estado do alerta, compartilhado com as telas de dentro do painel.
 *
 * A assinatura em tempo real é uma só, criada por `AdminShell`. Se cada tela
 * chamasse o hook de novo, abriria um canal por tela — por isso o valor desce
 * por contexto em vez de o hook ser chamado outra vez.
 */
export const ContextoAlerta = createContext<AlertaPedidos | null>(null);

/** Fora do painel (ou antes do provedor) o padrão é o modo conservador. */
export const useAlerta = (): AlertaPedidos =>
  useContext(ContextoAlerta) ?? {
    pendentes: 0,
    somLigado: false,
    alternarSom: () => {},
    tempoRealAtivo: false,
  };

/** Ritmo de varredura que uma lista do painel deve usar. */
export const intervaloVarredura = (tempoRealAtivo: boolean) =>
  tempoRealAtivo ? INTERVALO_COM_TEMPO_REAL : INTERVALO_SEM_TEMPO_REAL;
