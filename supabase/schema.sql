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
