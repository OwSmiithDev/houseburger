-- House Burger — estrutura do banco
-- Cole no editor SQL do Supabase e execute. Pode rodar mais de uma vez.

-- ---------------------------------------------------------------- configuração
-- Linha única. O `id` fixo em 1 com CHECK garante que nunca exista uma segunda.
create table if not exists store_settings (
  id              int primary key default 1 check (id = 1),
  nome            text        not null default 'House Burger',
  whatsapp        text        not null default '',
  chave_pix       text        not null default '',
  banner_url      text        not null default '',
  logo_url        text        not null default '',
  avaliacao       numeric(2,1) not null default 5.0,
  avaliacoes      text        not null default '',
  tempo_min       int         not null default 25,
  tempo_max       int         not null default 40,
  taxa_entrega    numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  taxa_servico    numeric(5,4)  not null default 0 check (taxa_servico >= 0 and taxa_servico <= 1),
  pedido_minimo   numeric(10,2) not null default 0 check (pedido_minimo >= 0),
  gorjetas        numeric(10,2)[] not null default '{}',
  aberta          boolean     not null default true,
  atualizado_em   timestamptz not null default now()
);

-- ------------------------------------------------------------------- categorias
create table if not exists categories (
  id       uuid primary key default gen_random_uuid(),
  slug     text unique not null,
  rotulo   text not null,
  icone    text not null default 'UtensilsCrossed',
  ordem    int  not null default 0,
  ativa    boolean not null default true
);

-- --------------------------------------------------------------------- produtos
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  nome        text not null,
  descricao   text not null default '',
  preco       numeric(10,2) not null check (preco >= 0),
  image_url   text not null default '',
  category_id uuid not null references categories(id) on delete restrict,
  destaque    boolean not null default false,
  esgotado    boolean not null default false,
  ordem       int not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
create index if not exists products_categoria_idx on products(category_id, ordem);

-- ------------------------------------------------------------ grupos de opções
-- Os grupos são reaproveitados entre produtos (pão, ponto, adicionais), por
-- isso vivem em tabela própria com junção, e não aninhados no produto.
create table if not exists option_groups (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  nome      text not null,
  min_opcoes int not null default 0 check (min_opcoes >= 0),
  max_opcoes int not null default 1 check (max_opcoes >= 1),
  ordem     int not null default 0,
  constraint min_menor_que_max check (min_opcoes <= max_opcoes)
);

create table if not exists option_items (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references option_groups(id) on delete cascade,
  slug        text not null,
  nome        text not null,
  price_delta numeric(10,2) not null default 0,
  esgotado    boolean not null default false,
  ordem       int not null default 0,
  unique (group_id, slug)
);
create index if not exists option_items_grupo_idx on option_items(group_id, ordem);

create table if not exists product_groups (
  product_id uuid not null references products(id) on delete cascade,
  group_id   uuid not null references option_groups(id) on delete cascade,
  ordem      int not null default 0,
  primary key (product_id, group_id)
);

-- ---------------------------------------------------------------------- cupons
create table if not exists coupons (
  id           uuid primary key default gen_random_uuid(),
  codigo       text unique not null,
  descricao    text not null default '',
  tipo         text not null check (tipo in ('percent','fixed','shipping')),
  valor        numeric(10,4) not null default 0 check (valor >= 0),
  min_subtotal numeric(10,2) not null default 0 check (min_subtotal >= 0),
  ativo        boolean not null default true
);

-- --------------------------------------------------------------------- pedidos
-- Diferente do carrinho, que relê tudo do catálogo, o pedido congela nome e
-- preço no instante da compra: um reajuste posterior não pode alterar o
-- histórico nem o que foi combinado com o cliente.
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  codigo         text unique not null,
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
  gorjeta        numeric(10,2) not null default 0,
  total          numeric(10,2) not null,
  status         text not null default 'pendente'
                 check (status in ('pendente','preparando','saiu','entregue','cancelado')),
  criado_em      timestamptz not null default now()
);
create index if not exists orders_criado_idx on orders(criado_em desc);
create index if not exists orders_status_idx on orders(status, criado_em desc);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  nome        text not null,
  quantidade  int not null check (quantidade > 0),
  preco_unit  numeric(10,2) not null,
  total       numeric(10,2) not null,
  observacao  text not null default '',
  -- [{ grupo, opcao, quantidade, price_delta }] congelado
  opcoes      jsonb not null default '[]'::jsonb,
  ordem       int not null default 0
);
create index if not exists order_items_pedido_idx on order_items(order_id, ordem);

-- Código curto e legível para a comanda: HB-4F2A
create or replace function gerar_codigo_pedido() returns text
language sql volatile as $$
  select 'HB-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
$$;

-- ============================================================================
-- Localização da loja e taxa de entrega por distância
--
-- ALTER idempotente: vale tanto para banco novo quanto para o já existente.
-- ============================================================================

alter table store_settings
  add column if not exists endereco       text not null default '',
  add column if not exists lat            numeric(10,6),
  add column if not exists lng            numeric(10,6),
  -- 'fixo' = uma taxa só; 'km' = base + valor por quilômetro em linha reta
  add column if not exists entrega_modo   text not null default 'fixo'
                                          check (entrega_modo in ('fixo','km')),
  add column if not exists taxa_base      numeric(10,2) not null default 0
                                          check (taxa_base >= 0),
  add column if not exists taxa_por_km    numeric(10,2) not null default 0
                                          check (taxa_por_km >= 0),
  -- Além deste raio a loja não entrega. Nulo = sem limite.
  add column if not exists raio_maximo_km numeric(6,2)
                                          check (raio_maximo_km is null or raio_maximo_km > 0);

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

-- ============================================================================
-- Acompanhamento do pedido pelo cliente
-- ============================================================================

/*
 * O código curto (HB-XXXX) tem 65 mil combinações: serve para a cozinha
 * conversar sobre o pedido, não como chave de acesso — daria para varrer.
 * O token uuid é o que autoriza o cliente a consultar o próprio pedido.
 */
alter table orders
  add column if not exists token uuid not null default gen_random_uuid();

create unique index if not exists orders_token_idx on orders(token);

-- A gorjeta saiu do produto. A coluna em `orders` fica (histórico), mas a
-- lista de sugestões era só configuração e pode cair.
alter table store_settings drop column if exists gorjetas;
