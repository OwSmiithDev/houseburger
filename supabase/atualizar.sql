-- ============================================================================
-- Atualização de uma instalação existente
-- ============================================================================
--
-- Cole no editor SQL do Supabase e execute UMA vez. Traz um banco que já está
-- em operação para o estado atual do código, sem tocar em nenhum dado.
--
-- Quem está montando uma empresa NOVA não precisa deste arquivo: use
-- supabase/instalar.sql, que já vem com tudo.
--
-- O que muda:
--   1. Transmissão em tempo real da tabela `orders`  (pedido novo aparecendo na hora)
--   2. Prefixo do código do pedido vindo da configuração
--   3. `consultar_pedido` devolvendo talheres, cupom e coordenadas
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Transmissão em tempo real
-- ----------------------------------------------------------------------------
--
-- Esta é a correção do "pedido novo só aparece depois de um tempo". O Supabase
-- só transmite mudanças de tabelas que estejam na publicação
-- `supabase_realtime`, e isso não é automático. Sem esta linha o painel abre o
-- WebSocket, assina o canal, recebe "SUBSCRIBED" e nunca recebe um evento — o
-- pedido só surge na varredura seguinte, com o cliente já esperando.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;

alter table orders replica identity full;


-- ----------------------------------------------------------------------------
-- 2. Prefixo do código do pedido
-- ----------------------------------------------------------------------------
--
-- Era 'HB-' fixo dentro da função, o que faria qualquer outra empresa emitir
-- comandas com a sigla do House Burger. Passa a vir da configuração.
--
-- Nesta base o padrão fica 'HB' de propósito: mudar agora faria os pedidos
-- novos saírem com sigla diferente dos antigos, no meio do histórico.

alter table store_settings
  add column if not exists prefixo_codigo text not null default 'HB';

update store_settings set prefixo_codigo = 'HB'
 where id = 1 and coalesce(prefixo_codigo, '') = '';

create or replace function gerar_codigo_pedido() returns text
language sql volatile as $$
  select coalesce(
           nullif((select prefixo_codigo from store_settings where id = 1), ''),
           'PED'
         )
         || '-'
         || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
$$;


-- ----------------------------------------------------------------------------
-- 3. consultar_pedido com os campos que faltavam
-- ----------------------------------------------------------------------------
--
-- O botão "Enviar comanda no WhatsApp" da tela de acompanhamento remonta a
-- comanda a partir do que esta função devolve. Sem estes campos ela saía sem a
-- linha de talheres, sem o código do cupom e sem o link do mapa.

-- ============================================================================
-- Consulta do pedido pelo cliente
-- ============================================================================

/*
 * O visitante não tem permissão de leitura em `orders` — de propósito, para
 * ninguém varrer os pedidos alheios. Esta função é a única porta, e só abre
 * para quem tem o token uuid daquele pedido específico.
 */
create or replace function consultar_pedido(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ped   orders%rowtype;
  itens jsonb;
begin
  select * into ped from orders where token = p_token;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'nome', nome, 'quantidade', quantidade,
           'total', total, 'observacao', observacao, 'opcoes', opcoes
         ) order by ordem), '[]'::jsonb)
    into itens
    from order_items where order_id = ped.id;

  -- Devolve só o que o cliente precisa ver. Nada de dados internos.
  return jsonb_build_object(
    'codigo', ped.codigo,
    'status', ped.status,
    'criado_em', ped.criado_em,
    'tipo_entrega', ped.tipo_entrega,
    'pagamento', ped.pagamento,
    'troco_para', ped.troco_para,
    'endereco', ped.endereco,
    'complemento', ped.complemento,
    'cliente_nome', ped.cliente_nome,
    'subtotal', ped.subtotal,
    'desconto', ped.desconto,
    'taxa_entrega', ped.taxa_entrega,
    'taxa_servico', ped.taxa_servico,
    'total', ped.total,
    -- O que falta para remontar a comanda do WhatsApp a partir daqui, quando
    -- o navegador engole a janela no momento do envio.
    'talheres', ped.talheres,
    'cupom_codigo', ped.cupom_codigo,
    'lat', ped.lat,
    'lng', ped.lng,
    'itens', itens
  );
end;
$$;

revoke all on function consultar_pedido(uuid) from public;
grant execute on function consultar_pedido(uuid) to anon, authenticated;
