-- ============================================================================
-- Cardápio digital — instalação completa do banco
-- ============================================================================
--
-- Cole este arquivo inteiro no editor SQL do Supabase e execute UMA vez.
-- Ele cria tudo: tabelas, índices, funções, regras de acesso, transmissão em
-- tempo real e o balde de imagens. Pode ser executado de novo sem estragar
-- nada — tudo aqui é idempotente.
--
-- Para montar o sistema para uma empresa nova, veja docs/REPLICAR.md.
--
-- Seções:
--   1. Tabelas e índices
--   2. Funções de apoio (código do pedido, distância, taxa de entrega)
--   3. create_order — registro do pedido, com os valores recalculados aqui
--   4. consultar_pedido — acompanhamento pelo cliente
--   5. Relatórios de vendas
--   6. Regras de acesso (RLS)
--   7. Transmissão em tempo real
--   8. Balde de imagens
--   9. Linha de configuração da loja
-- ============================================================================


-- ============================================================================
-- 1. TABELAS E ÍNDICES
-- ============================================================================

-- --------------------------------------------------------------- configuração
-- Linha única. O `id` fixo em 1 com CHECK garante que nunca exista uma segunda.
create table if not exists store_settings (
  id              int primary key default 1 check (id = 1),
  nome            text          not null default 'Minha Loja',
  whatsapp        text          not null default '',
  chave_pix       text          not null default '',
  banner_url      text          not null default '',
  logo_url        text          not null default '',
  avaliacao       numeric(2,1)  not null default 5.0,
  avaliacoes      text          not null default '',
  tempo_min       int           not null default 25,
  tempo_max       int           not null default 40,
  taxa_servico    numeric(5,4)  not null default 0
                                check (taxa_servico >= 0 and taxa_servico <= 1),
  pedido_minimo   numeric(10,2) not null default 0 check (pedido_minimo >= 0),
  aberta          boolean       not null default true,

  -- Endereço da loja: aparece para quem escolhe retirar e é a origem do
  -- cálculo de distância.
  endereco        text          not null default '',
  lat             numeric(10,6),
  lng             numeric(10,6),

  -- Prefixo do código do pedido (PED-4F2A). Fica aqui, e não dentro da função,
  -- para cada empresa emitir comandas com a própria sigla.
  prefixo_codigo  text          not null default 'PED',

  -- 'fixo' = uma taxa só; 'km' = base + valor por quilômetro em linha reta.
  entrega_modo    text          not null default 'fixo'
                                check (entrega_modo in ('fixo','km')),
  taxa_entrega    numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  taxa_base       numeric(10,2) not null default 0 check (taxa_base >= 0),
  taxa_por_km     numeric(10,2) not null default 0 check (taxa_por_km >= 0),
  -- Além deste raio a loja não entrega. Nulo = sem limite.
  raio_maximo_km  numeric(6,2)  check (raio_maximo_km is null or raio_maximo_km > 0),

  atualizado_em   timestamptz   not null default now()
);

-- Colunas acrescentadas depois da primeira versão: rodar este arquivo sobre um
-- banco antigo o traz para a forma acima sem perder dados.
alter table store_settings
  add column if not exists logo_url       text          not null default '',
  add column if not exists endereco       text          not null default '',
  add column if not exists lat            numeric(10,6),
  add column if not exists lng            numeric(10,6),
  add column if not exists prefixo_codigo text          not null default 'PED',
  add column if not exists entrega_modo   text          not null default 'fixo',
  add column if not exists taxa_base      numeric(10,2) not null default 0,
  add column if not exists taxa_por_km    numeric(10,2) not null default 0,
  add column if not exists raio_maximo_km numeric(6,2);

-- A gorjeta ao entregador saiu do produto; a lista de sugestões era só
-- configuração e pode cair.
alter table store_settings drop column if exists gorjetas;

-- ----------------------------------------------------------------- categorias
create table if not exists categories (
  id       uuid primary key default gen_random_uuid(),
  slug     text unique not null,
  rotulo   text not null,
  icone    text not null default 'UtensilsCrossed',
  ordem    int  not null default 0,
  ativa    boolean not null default true
);

-- ------------------------------------------------------------------- produtos
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  nome         text not null,
  descricao    text not null default '',
  preco        numeric(10,2) not null check (preco >= 0),
  image_url    text not null default '',
  category_id  uuid references categories(id) on delete set null,
  destaque     boolean not null default false,
  esgotado     boolean not null default false,
  ativo        boolean not null default true,
  ordem        int not null default 0,
  criado_em    timestamptz not null default now()
);
create index if not exists products_categoria_idx on products(category_id, ordem);

-- ---------------------------------------------------------- grupos de opções
create table if not exists option_groups (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  nome         text not null,
  min_opcoes   int not null default 0 check (min_opcoes >= 0),
  max_opcoes   int not null default 1 check (max_opcoes >= 1),
  ordem        int not null default 0
);

create table if not exists option_items (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references option_groups(id) on delete cascade,
  slug         text not null,
  nome         text not null,
  price_delta  numeric(10,2) not null default 0,
  esgotado     boolean not null default false,
  ordem        int not null default 0,
  unique (group_id, slug)
);
create index if not exists option_items_grupo_idx on option_items(group_id, ordem);

create table if not exists product_groups (
  product_id  uuid not null references products(id) on delete cascade,
  group_id    uuid not null references option_groups(id) on delete cascade,
  ordem       int not null default 0,
  primary key (product_id, group_id)
);

-- --------------------------------------------------------------------- cupons
create table if not exists coupons (
  id            uuid primary key default gen_random_uuid(),
  codigo        text unique not null,
  descricao     text not null default '',
  -- 'percent' guarda fração (0.10 = 10%); 'fixed' guarda reais; 'shipping'
  -- zera a taxa de entrega e ignora o valor.
  tipo          text not null check (tipo in ('percent','fixed','shipping')),
  valor         numeric(10,2) not null default 0 check (valor >= 0),
  min_subtotal  numeric(10,2) not null default 0 check (min_subtotal >= 0),
  ativo         boolean not null default true,
  -- Nulo = sem validade. Depois desta data `create_order` recusa o cupom.
  expira_em     timestamptz
);

-- Coluna acrescentada depois da primeira versão.
alter table coupons add column if not exists expira_em timestamptz;

-- -------------------------------------------------------------------- pedidos
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  codigo         text unique not null,
  -- Chave de acesso do cliente ao próprio pedido. O código curto tem 65 mil
  -- combinações e daria para varrer; este não.
  token          uuid not null default gen_random_uuid(),
  cliente_nome   text not null,
  tipo_entrega   text not null check (tipo_entrega in ('pickup','delivery')),
  pagamento      text not null check (pagamento in ('pix','credit','debit','cash')),
  troco_para     numeric(10,2),
  endereco       text,
  complemento    text,
  lat            numeric(10,6),
  lng            numeric(10,6),
  talheres       boolean not null default false,
  observacao     text not null default '',
  cupom_codigo   text,
  subtotal       numeric(10,2) not null,
  desconto       numeric(10,2) not null default 0,
  taxa_entrega   numeric(10,2) not null default 0,
  taxa_servico   numeric(10,2) not null default 0,
  total          numeric(10,2) not null,
  status         text not null default 'pendente'
                 check (status in ('pendente','preparando','saiu','entregue','cancelado')),
  criado_em      timestamptz not null default now()
);

alter table orders
  add column if not exists token uuid not null default gen_random_uuid();

create index if not exists orders_criado_idx on orders(criado_em desc);
create index if not exists orders_status_idx on orders(status, criado_em desc);
create unique index if not exists orders_token_idx on orders(token);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  nome        text not null,
  quantidade  int not null check (quantidade > 0),
  preco_unit  numeric(10,2) not null,
  total       numeric(10,2) not null,
  observacao  text not null default '',
  -- [{ grupo, opcao, quantidade, price_delta }] congelado no momento do pedido
  opcoes      jsonb not null default '[]'::jsonb,
  ordem       int not null default 0
);
create index if not exists order_items_pedido_idx on order_items(order_id, ordem);


-- ============================================================================
-- 2. FUNÇÕES DE APOIO
-- ============================================================================

/*
 * Código curto e legível para a comanda: PED-4F2A.
 *
 * O prefixo vem da configuração da loja, não do corpo da função. Antes era
 * 'HB-' fixo aqui dentro, o que fazia qualquer outra empresa emitir comandas
 * com a sigla do House Burger.
 */
create or replace function gerar_codigo_pedido() returns text
language sql volatile as $$
  select coalesce(
           nullif((select prefixo_codigo from store_settings where id = 1), ''),
           'PED'
         )
         || '-'
         || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
$$;

/*
 * Distância em linha reta entre duas coordenadas (fórmula de haversine).
 *
 * É distância de mapa, não de rua: o percurso real costuma ser 20 a 40% maior.
 * Quem define a taxa precisa considerar isso ao escolher o valor por
 * quilômetro — a alternativa seria uma API de rotas, com custo e chave.
 */
create or replace function distancia_km(
  lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric
) returns numeric
language sql immutable as $$
  select round(
    (6371 * acos(
      least(1, greatest(-1,
        cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1))
        + sin(radians(lat1)) * sin(radians(lat2))
      ))
    ))::numeric, 2)
$$;

/*
 * Taxa de entrega para um destino.
 *
 * Devolve NULL quando o destino está fora do raio atendido — quem chama decide
 * se recusa o pedido ou apenas avisa.
 */
create or replace function taxa_entrega_para(dest_lat numeric, dest_lng numeric)
returns numeric
language plpgsql stable as $$
declare
  cfg  store_settings%rowtype;
  dist numeric;
begin
  select * into cfg from store_settings where id = 1;

  if cfg.entrega_modo <> 'km' then
    return cfg.taxa_entrega;
  end if;

  -- Sem coordenada da loja ou do cliente não há como medir; cai na taxa fixa
  -- em vez de cobrar zero por engano.
  if cfg.lat is null or cfg.lng is null or dest_lat is null or dest_lng is null then
    return cfg.taxa_entrega;
  end if;

  dist := distancia_km(cfg.lat, cfg.lng, dest_lat, dest_lng);

  if cfg.raio_maximo_km is not null and dist > cfg.raio_maximo_km then
    return null;
  end if;

  return round(cfg.taxa_base + cfg.taxa_por_km * dist, 2);
end;
$$;

grant execute on function distancia_km(numeric, numeric, numeric, numeric) to anon, authenticated;
grant execute on function taxa_entrega_para(numeric, numeric) to anon, authenticated;


-- ==========================================================================
-- 3 e 4. PEDIDO: REGISTRO E CONSULTA
-- ==========================================================================

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


-- ==========================================================================
-- 5. RELATÓRIOS DE VENDAS
-- ==========================================================================

/*
 * Resumo do período: contagens, faturamento e ticket médio.
 * Cancelados nunca entram no faturamento.
 */
create or replace function relatorio_resumo(p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Acesso restrito';
  end if;

  select jsonb_build_object(
    'pedidos',      count(*),
    'entregues',    count(*) filter (where status = 'entregue'),
    'cancelados',   count(*) filter (where status = 'cancelado'),
    'em_andamento', count(*) filter (where status in ('pendente','preparando','saiu')),
    'faturamento',  coalesce(sum(total) filter (where status <> 'cancelado'), 0),
    'ticket_medio', coalesce(
                      avg(total) filter (where status <> 'cancelado'), 0),
    'entrega',      count(*) filter (where tipo_entrega = 'delivery' and status <> 'cancelado'),
    'retirada',     count(*) filter (where tipo_entrega = 'pickup' and status <> 'cancelado'),
    'taxa_entrega_total',
                    coalesce(sum(taxa_entrega) filter (where status <> 'cancelado'), 0),
    'desconto_total',
                    coalesce(sum(desconto) filter (where status <> 'cancelado'), 0)
  ) into r
  from orders
  where criado_em >= p_inicio and criado_em < p_fim;

  return r;
end;
$$;

/*
 * Série temporal do faturamento.
 *
 * `p_granularidade` aceita 'day', 'week' ou 'month' — os mesmos nomes que o
 * date_trunc do Postgres usa, para não haver tradução no meio do caminho.
 */
create or replace function relatorio_serie(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_granularidade text default 'day'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Acesso restrito';
  end if;

  if p_granularidade not in ('day','week','month') then
    raise exception 'Granularidade inválida';
  end if;

  -- generate_series preenche os períodos sem venda, senão o gráfico mostraria
  -- uma linha contínua escondendo os dias parados.
  select coalesce(jsonb_agg(jsonb_build_object(
           'periodo', p.periodo,
           'pedidos', coalesce(v.pedidos, 0),
           'faturamento', coalesce(v.faturamento, 0)
         ) order by p.periodo), '[]'::jsonb)
    into r
  from (
    select generate_series(
      date_trunc(p_granularidade, p_inicio),
      date_trunc(p_granularidade, p_fim - interval '1 second'),
      ('1 ' || p_granularidade)::interval
    ) as periodo
  ) p
  left join (
    select date_trunc(p_granularidade, criado_em) periodo,
           count(*) pedidos,
           sum(total) faturamento
      from orders
     where criado_em >= p_inicio and criado_em < p_fim
       and status <> 'cancelado'
     group by 1
  ) v on v.periodo = p.periodo;

  return r;
end;
$$;

/*
 * Itens mais vendidos e divisão por forma de pagamento, no mesmo período.
 */
create or replace function relatorio_detalhes(p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare itens jsonb; pagamentos jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Acesso restrito';
  end if;

  select coalesce(jsonb_agg(x order by x->>'quantidade' desc), '[]'::jsonb) into itens
  from (
    select jsonb_build_object(
             'nome', i.nome,
             'quantidade', sum(i.quantidade),
             'faturamento', sum(i.total)
           ) x, sum(i.quantidade) q
      from order_items i
      join orders o on o.id = i.order_id
     where o.criado_em >= p_inicio and o.criado_em < p_fim
       and o.status <> 'cancelado'
     group by i.nome
     order by q desc
     limit 10
  ) t;

  select coalesce(jsonb_agg(jsonb_build_object(
           'pagamento', pagamento, 'pedidos', n, 'faturamento', v
         ) order by v desc), '[]'::jsonb) into pagamentos
  from (
    select pagamento, count(*) n, sum(total) v
      from orders
     where criado_em >= p_inicio and criado_em < p_fim
       and status <> 'cancelado'
     group by pagamento
  ) t;

  return jsonb_build_object('itens', itens, 'pagamentos', pagamentos);
end;
$$;

revoke all on function relatorio_resumo(timestamptz, timestamptz) from public;
revoke all on function relatorio_serie(timestamptz, timestamptz, text) from public;
revoke all on function relatorio_detalhes(timestamptz, timestamptz) from public;
grant execute on function relatorio_resumo(timestamptz, timestamptz) to authenticated;
grant execute on function relatorio_serie(timestamptz, timestamptz, text) to authenticated;
grant execute on function relatorio_detalhes(timestamptz, timestamptz) to authenticated;


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
 *
 * ATENÇÃO ao intervalo: `p_inicio` é INCLUSIVO e `p_fim` é EXCLUSIVO
 * (`criado_em >= p_inicio and criado_em < p_fim`). Para o dia 28 inteiro,
 * passe 28T00:00 e 29T00:00 — passar 28 nas duas pontas devolve vazio, porque
 * nenhum instante é ao mesmo tempo maior-ou-igual e menor que a mesma
 * meia-noite. Foi exatamente esse o defeito que a tela teve.
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


-- ==========================================================================
-- 6. REGRAS DE ACESSO (RLS)
-- ==========================================================================

alter table store_settings enable row level security;
alter table categories     enable row level security;
alter table products       enable row level security;
alter table option_groups  enable row level security;
alter table option_items   enable row level security;
alter table product_groups enable row level security;
alter table coupons        enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;

-- Recriar sem erro em execuções repetidas
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- ------------------------------------------------------------------- catálogo
-- Leitura pública apenas do que está publicado.
create policy leitura_publica_config on store_settings
  for select to anon, authenticated using (true);

create policy leitura_publica_categorias on categories
  for select to anon, authenticated using (ativa);

create policy leitura_publica_produtos on products
  for select to anon, authenticated using (ativo);

create policy leitura_publica_grupos on option_groups
  for select to anon, authenticated using (true);

create policy leitura_publica_opcoes on option_items
  for select to anon, authenticated using (true);

create policy leitura_publica_juncao on product_groups
  for select to anon, authenticated using (true);

-- Cupom inativo não aparece nem para quem lista.
create policy leitura_publica_cupons on coupons
  for select to anon, authenticated using (ativo);

-- ----------------------------------------------------------------- escrita
-- Só o dono autenticado. Sem sessão válida o banco recusa, mesmo que alguém
-- force a rota /admin no navegador.
create policy dono_escreve_config     on store_settings for all to authenticated using (true) with check (true);
create policy dono_escreve_categorias on categories     for all to authenticated using (true) with check (true);
create policy dono_escreve_produtos   on products       for all to authenticated using (true) with check (true);
create policy dono_escreve_grupos     on option_groups  for all to authenticated using (true) with check (true);
create policy dono_escreve_opcoes     on option_items   for all to authenticated using (true) with check (true);
create policy dono_escreve_juncao     on product_groups for all to authenticated using (true) with check (true);
create policy dono_escreve_cupons     on coupons        for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------------ pedidos
-- Nenhuma política para anon: o visitante não lê pedidos de ninguém e não
-- insere direto. A única porta de entrada é a função create_order.
create policy dono_le_pedidos   on orders      for all to authenticated using (true) with check (true);
create policy dono_le_itens     on order_items for all to authenticated using (true) with check (true);


-- ============================================================================
-- 7. TRANSMISSÃO EM TEMPO REAL
-- ============================================================================

/*
 * Sem isto o painel não sabe que entrou pedido.
 *
 * O Supabase só transmite mudanças de tabelas que estejam na publicação
 * `supabase_realtime`, e isso NÃO é automático. Faltando esta linha, o painel
 * abre o WebSocket, assina o canal, recebe "SUBSCRIBED" — e nunca recebe um
 * evento. O pedido só aparece na varredura seguinte, meio minuto depois, com o
 * cliente já esperando.
 *
 * `replica identity full` faz o evento de UPDATE carregar também os valores
 * antigos; sem isso a mudança de status chega sem o "de onde veio".
 */
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


-- ============================================================================
-- 8. BALDE DE IMAGENS
-- ============================================================================

/*
 * Fotos de produto, logo e banner. Público na leitura: a imagem precisa abrir
 * para qualquer cliente, sem sessão. Escrita só para quem está autenticado —
 * ou seja, o dono logado no painel.
 *
 * Era um passo manual no painel do Supabase, fácil de esquecer numa instalação
 * nova (e o sintoma, "a foto não envia", não diz o motivo).
 */
insert into storage.buckets (id, name, public)
values ('midia', 'midia', true)
on conflict (id) do update set public = true;

do $$
begin
  execute 'drop policy if exists midia_leitura_publica on storage.objects';
  execute 'drop policy if exists midia_dono_envia on storage.objects';
  execute 'drop policy if exists midia_dono_atualiza on storage.objects';
  execute 'drop policy if exists midia_dono_apaga on storage.objects';
exception when insufficient_privilege then
  raise notice 'Sem permissão para mexer nas políticas de storage — crie o balde "midia" pelo painel.';
end $$;

do $$
begin
  execute $p$create policy midia_leitura_publica on storage.objects
             for select to anon, authenticated using (bucket_id = 'midia')$p$;
  execute $p$create policy midia_dono_envia on storage.objects
             for insert to authenticated with check (bucket_id = 'midia')$p$;
  execute $p$create policy midia_dono_atualiza on storage.objects
             for update to authenticated using (bucket_id = 'midia')$p$;
  execute $p$create policy midia_dono_apaga on storage.objects
             for delete to authenticated using (bucket_id = 'midia')$p$;
exception when insufficient_privilege then
  raise notice 'Sem permissão para criar políticas de storage — faça em Storage > Policies.';
end $$;


-- ============================================================================
-- 9. LINHA DE CONFIGURAÇÃO DA LOJA
-- ============================================================================

/*
 * Uma linha só, id = 1. O `do nothing` é proposital: rodar este arquivo de
 * novo não pode apagar o que o dono já configurou pelo painel.
 *
 * Preencha os dados da empresa pelo painel em /admin > Loja, ou com o UPDATE
 * comentado abaixo.
 */
insert into store_settings (id) values (1) on conflict (id) do nothing;

-- Modelo para preencher de uma vez. Descomente e ajuste:
--
-- update store_settings set
--   nome           = 'Nome da Empresa',
--   prefixo_codigo = 'ABC',
--   whatsapp       = '5562999999999',
--   chave_pix      = '5562999999999',
--   endereco       = 'Rua Exemplo, 100 - Centro, Cidade - UF',
--   lat            = -16.6799,
--   lng            = -49.2550,
--   tempo_min      = 25,
--   tempo_max      = 40,
--   pedido_minimo  = 20,
--   entrega_modo   = 'km',
--   taxa_base      = 5.00,
--   taxa_por_km    = 1.50,
--   raio_maximo_km = 8,
--   aberta         = true
-- where id = 1;


-- ============================================================================
-- Pronto.
--
-- Falta o que não dá para fazer por SQL:
--   1. Criar o usuário do dono em Authentication > Users (marque Auto Confirm)
--   2. Desligar Authentication > Providers > Email > Enable signup
--   3. Preencher VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env
--
-- Para um cardápio de demonstração, rode depois: supabase/exemplo.sql
-- ============================================================================
