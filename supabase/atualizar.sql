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
--   4. Validade nos cupons
--   5. Busca de pedidos por código, cliente e data
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


-- ----------------------------------------------------------------------------
-- 4. Validade nos cupons
-- ----------------------------------------------------------------------------
--
-- Nulo = sem validade, que é como todos os cupons existentes ficam. Nada muda
-- de comportamento até alguém preencher uma data no painel.

alter table coupons add column if not exists expira_em timestamptz;

-- A função também precisa ser recriada: é ela que recusa o cupom vencido no
-- momento do pedido. Idêntica à do `instalar.sql`.

create or replace function create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg              store_settings%rowtype;
  item             jsonb;
  opcao            jsonb;
  prod             products%rowtype;
  grp              option_groups%rowtype;
  opt              option_items%rowtype;
  cupom            coupons%rowtype;
  v_order_id       uuid;
  v_codigo         text;
  v_tipo_entrega   text;
  v_pagamento      text;
  v_nome           text;
  v_subtotal       numeric(10,2) := 0;
  v_desconto       numeric(10,2) := 0;
  v_taxa_entrega   numeric(10,2) := 0;
  v_taxa_servico   numeric(10,2) := 0;
  v_total          numeric(10,2) := 0;
  v_unit           numeric(10,2);
  v_qtd            int;
  v_qtd_opt        int;
  v_marcado        int;
  v_opcoes_json    jsonb;
  v_entrega_gratis boolean := false;
  v_troco          numeric(10,2);
  v_ordem          int := 0;
  v_itens          jsonb := '[]'::jsonb;
begin
  select * into cfg from store_settings where id = 1;
  if not found then
    raise exception 'Configuração da loja não encontrada';
  end if;

  if not cfg.aberta then
    raise exception 'A loja está fechada no momento';
  end if;

  v_nome := trim(coalesce(payload->>'cliente_nome', ''));
  if v_nome = '' then
    raise exception 'Nome do cliente é obrigatório';
  end if;

  v_tipo_entrega := coalesce(payload->>'tipo_entrega', '');
  if v_tipo_entrega not in ('pickup','delivery') then
    raise exception 'Tipo de entrega inválido';
  end if;

  v_pagamento := coalesce(payload->>'pagamento', '');
  if v_pagamento not in ('pix','credit','debit','cash') then
    raise exception 'Forma de pagamento inválida';
  end if;

  if v_tipo_entrega = 'delivery'
     and trim(coalesce(payload->>'endereco','')) = '' then
    raise exception 'Endereço é obrigatório para entrega';
  end if;

  if jsonb_typeof(payload->'itens') <> 'array'
     or jsonb_array_length(payload->'itens') = 0 then
    raise exception 'Pedido sem itens';
  end if;

  insert into orders (
    codigo, cliente_nome, tipo_entrega, pagamento, endereco, complemento,
    lat, lng, talheres, observacao, subtotal, total
  ) values (
    gerar_codigo_pedido(), v_nome, v_tipo_entrega, v_pagamento,
    nullif(trim(coalesce(payload->>'endereco','')), ''),
    nullif(trim(coalesce(payload->>'complemento','')), ''),
    (payload->>'lat')::numeric, (payload->>'lng')::numeric,
    coalesce((payload->>'talheres')::boolean, false),
    left(coalesce(payload->>'observacao',''), 300),
    0, 0
  ) returning id, codigo into v_order_id, v_codigo;

  -- ------------------------------------------------------------- itens
  for item in select * from jsonb_array_elements(payload->'itens')
  loop
    -- O cliente identifica produtos por slug (o mesmo que aparece na URL);
    -- o uuid é detalhe interno do banco.
    select * into prod from products
      where slug = item->>'product_slug' and ativo and not esgotado;
    if not found then
      raise exception 'Produto indisponível: %', coalesce(item->>'product_slug','?');
    end if;

    v_qtd := coalesce((item->>'quantidade')::int, 0);
    if v_qtd < 1 or v_qtd > 99 then
      raise exception 'Quantidade inválida para %', prod.nome;
    end if;

    -- O preço parte SEMPRE da tabela, nunca do que o cliente mandou.
    v_unit := prod.preco;
    v_opcoes_json := '[]'::jsonb;

    -- Cada grupo do produto: confere mínimo, máximo e a origem das opções.
    for grp in
      select g.* from option_groups g
        join product_groups pg on pg.group_id = g.id
       where pg.product_id = prod.id
       order by pg.ordem
    loop
      v_marcado := 0;

      for opcao in
        select * from jsonb_array_elements(coalesce(item->'opcoes','[]'::jsonb))
      loop
        -- A opção precisa pertencer a ESTE grupo. Mandar o slug de uma opção
        -- de outro grupo (ou de outro produto) simplesmente não encontra nada,
        -- porque a busca é sempre restrita ao grupo corrente.
        select * into opt from option_items
          where slug = opcao->>'option_slug'
            and group_id = grp.id
            and not esgotado;
        if not found then
          continue;
        end if;

        v_qtd_opt := coalesce((opcao->>'quantidade')::int, 0);
        if v_qtd_opt < 1 then
          continue;
        end if;
        if v_marcado + v_qtd_opt > grp.max_opcoes then
          raise exception 'Excedeu o limite de "%" em %', grp.nome, prod.nome;
        end if;

        v_marcado := v_marcado + v_qtd_opt;
        v_unit := v_unit + opt.price_delta * v_qtd_opt;
        v_opcoes_json := v_opcoes_json || jsonb_build_object(
          'grupo', grp.nome, 'opcao', opt.nome,
          'quantidade', v_qtd_opt, 'price_delta', opt.price_delta
        );
      end loop;

      if v_marcado < grp.min_opcoes then
        raise exception 'Falta escolher "%" em %', grp.nome, prod.nome;
      end if;
    end loop;

    v_unit := greatest(v_unit, 0);
    v_subtotal := v_subtotal + v_unit * v_qtd;

    insert into order_items (
      order_id, product_id, nome, quantidade, preco_unit, total, observacao, opcoes, ordem
    ) values (
      v_order_id, prod.id, prod.nome, v_qtd, v_unit, v_unit * v_qtd,
      left(coalesce(item->>'observacao',''), 200), v_opcoes_json, v_ordem
    );

    v_itens := v_itens || jsonb_build_object(
      'nome', prod.nome, 'quantidade', v_qtd,
      'preco_unit', v_unit, 'total', v_unit * v_qtd,
      'observacao', coalesce(item->>'observacao',''), 'opcoes', v_opcoes_json
    );
    v_ordem := v_ordem + 1;
  end loop;

  -- ------------------------------------------------------------- taxas
  if v_subtotal < cfg.pedido_minimo then
    raise exception 'Pedido mínimo de % não atingido', cfg.pedido_minimo;
  end if;

  if v_tipo_entrega = 'delivery' then
    -- A taxa é calculada aqui, nunca aceita do cliente. No modo por
    -- quilômetro isso também é o que impede alguém de pedir de longe
    -- pagando o frete de perto.
    v_taxa_entrega := taxa_entrega_para(
      (payload->>'lat')::numeric, (payload->>'lng')::numeric
    );

    if v_taxa_entrega is null then
      raise exception 'Endereço fora da área de entrega (raio de % km)', cfg.raio_maximo_km;
    end if;

    -- No modo por quilômetro o ponto no mapa é obrigatório: sem ele não há
    -- como medir, e cair na taxa fixa premiaria quem não marcasse.
    if cfg.entrega_modo = 'km'
       and cfg.lat is not null
       and (payload->>'lat') is null then
      raise exception 'Marque o local da entrega no mapa para calcularmos a taxa';
    end if;
  end if;

  -- O cupom é buscado pelo código; o desconto que o cliente calculou é ignorado.
  -- A validade também é conferida aqui: a tela do cliente esconde o cupom
  -- vencido por conveniência, mas quem recusa é o banco.
  if coalesce(payload->>'cupom_codigo','') <> '' then
    select * into cupom from coupons
      where upper(codigo) = upper(payload->>'cupom_codigo')
        and ativo
        and (expira_em is null or expira_em > now());
    if found and v_subtotal >= cupom.min_subtotal then
      if cupom.tipo = 'percent' then
        v_desconto := round(v_subtotal * cupom.valor, 2);
      elsif cupom.tipo = 'fixed' then
        v_desconto := least(cupom.valor, v_subtotal);
      elsif cupom.tipo = 'shipping' then
        v_entrega_gratis := true;
        v_taxa_entrega := 0;
      end if;
      update orders set cupom_codigo = cupom.codigo where id = v_order_id;
    end if;
  end if;

  v_taxa_servico := round(v_subtotal * cfg.taxa_servico, 2);

  v_total := greatest(0, v_subtotal - v_desconto + v_taxa_entrega + v_taxa_servico);

  if v_pagamento = 'cash' then
    v_troco := (payload->>'troco_para')::numeric;
    if v_troco is not null and v_troco < v_total then
      raise exception 'Troco menor que o total do pedido';
    end if;
  end if;

  update orders set
    subtotal = v_subtotal, desconto = v_desconto, taxa_entrega = v_taxa_entrega,
    taxa_servico = v_taxa_servico, total = v_total,
    troco_para = v_troco
  where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id, 'codigo', v_codigo, 'itens', v_itens,
    'distancia_km', case
      when v_tipo_entrega = 'delivery' and cfg.lat is not null and (payload->>'lat') is not null
      then distancia_km(cfg.lat, cfg.lng, (payload->>'lat')::numeric, (payload->>'lng')::numeric)
      else null end,
    'subtotal', v_subtotal, 'desconto', v_desconto,
    'taxa_entrega', v_taxa_entrega, 'entrega_gratis', v_entrega_gratis,
    'taxa_servico', v_taxa_servico,
    'total', v_total, 'troco_para', v_troco,
    'token', (select token from orders where id = v_order_id)
  );
end;
$$;

-- O visitante só pode chamar esta função; escrever em orders continua vedado.
revoke all on function create_order(jsonb) from public;
grant execute on function create_order(jsonb) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. Busca de pedidos
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Busca de pedidos no painel
-- ----------------------------------------------------------------------------

/*
 * Procura em todo o histórico, por código, nome do cliente, status e período.
 *
 * A tela carrega só os pedidos mais recentes, então filtrar no navegador
 * deixaria um pedido de mês passado invisível — e sem nenhum sinal de que ele
 * existe. A busca precisa acontecer onde estão todos os pedidos.
 *
 * `security definer` restrito a autenticado, no mesmo padrão das funções de
 * relatório: o visitante não lê a tabela `orders` de jeito nenhum.
 */
create or replace function buscar_pedidos(
  p_texto  text        default null,
  p_inicio timestamptz default null,
  p_fim    timestamptz default null,
  p_status text        default null,
  p_limite int         default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_texto text;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Acesso restrito';
  end if;

  -- `%` e `_` são curingas no LIKE; escapados, uma busca por "50%" procura
  -- "50%" em vez de qualquer coisa começada em 50.
  v_texto := nullif(trim(coalesce(p_texto, '')), '');
  if v_texto is not null then
    v_texto := '%' || replace(replace(v_texto, '%', '\%'), '_', '\_') || '%';
  end if;

  return coalesce((
    select jsonb_agg(p order by p->>'criado_em' desc)
      from (
        select jsonb_build_object(
                 'id', o.id,
                 'codigo', o.codigo,
                 'cliente_nome', o.cliente_nome,
                 'tipo_entrega', o.tipo_entrega,
                 'pagamento', o.pagamento,
                 'troco_para', o.troco_para,
                 'endereco', o.endereco,
                 'complemento', o.complemento,
                 'lat', o.lat,
                 'lng', o.lng,
                 'talheres', o.talheres,
                 'observacao', o.observacao,
                 'cupom_codigo', o.cupom_codigo,
                 'subtotal', o.subtotal,
                 'desconto', o.desconto,
                 'taxa_entrega', o.taxa_entrega,
                 'taxa_servico', o.taxa_servico,
                 'total', o.total,
                 'status', o.status,
                 'criado_em', o.criado_em,
                 'order_items', coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'id', i.id,
                            'nome', i.nome,
                            'quantidade', i.quantidade,
                            'preco_unit', i.preco_unit,
                            'total', i.total,
                            'observacao', i.observacao,
                            'opcoes', i.opcoes
                          ) order by i.ordem)
                     from order_items i where i.order_id = o.id
                 ), '[]'::jsonb)
               ) as p
          from orders o
         where (v_texto is null
                or o.codigo ilike v_texto
                or o.cliente_nome ilike v_texto)
           and (p_inicio is null or o.criado_em >= p_inicio)
           and (p_fim    is null or o.criado_em <  p_fim)
           and (p_status is null or o.status = p_status)
         order by o.criado_em desc
         limit greatest(1, least(coalesce(p_limite, 100), 300))
      ) as achados
  ), '[]'::jsonb);
end;
$$;

revoke all on function buscar_pedidos(text, timestamptz, timestamptz, text, int) from public;
grant execute on function buscar_pedidos(text, timestamptz, timestamptz, text, int) to authenticated;

/*
 * Índice para a busca por trecho do nome ou do código.
 *
 * Um índice comum não serviria: `ilike '%maria%'` começa com curinga, e um
 * B-tree só ajuda quando o começo do texto é conhecido. Trigramas indexam
 * pedaços de três letras, e é o que faz esse tipo de busca não varrer a
 * tabela inteira a cada tecla digitada.
 */
create extension if not exists pg_trgm;

create index if not exists orders_busca_idx
  on orders using gin (cliente_nome gin_trgm_ops, codigo gin_trgm_ops);
