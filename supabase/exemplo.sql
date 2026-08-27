-- ============================================================================
-- Cardápio de demonstração
-- ============================================================================
--
-- Opcional. Rode depois de instalar.sql para a loja abrir já funcionando, com
-- o suficiente para o dono ver como as peças se encaixam: uma categoria com
-- opções obrigatórias, uma com opção múltipla e uma sem nenhuma.
--
-- São produtos genéricos de propósito — troque tudo pelo cardápio real em
-- /admin > Produtos. Para apagar a demonstração de uma vez:
--
--   delete from products where slug like 'demo-%';
--   delete from option_groups where slug like 'demo-%';
--   delete from categories where slug like 'demo-%';
--   delete from coupons where codigo = 'BEMVINDO';
--
-- Pode ser executado mais de uma vez: usa `on conflict do update`.
-- ============================================================================

-- ------------------------------------------------------------------ categorias
insert into categories (slug, rotulo, icone, ordem, ativa) values
  ('demo-pratos',    'Pratos',    'UtensilsCrossed', 0, true),
  ('demo-bebidas',   'Bebidas',   'CupSoda',         1, true),
  ('demo-sobremesas','Sobremesas','IceCream',        2, true)
on conflict (slug) do update set
  rotulo = excluded.rotulo,
  icone  = excluded.icone,
  ordem  = excluded.ordem,
  ativa  = excluded.ativa;

-- ------------------------------------------------------------ grupos de opções
-- Obrigatório e de escolha única: o botão de adicionar fica travado até o
-- cliente escolher.
insert into option_groups (slug, nome, descricao, min_opcoes, max_opcoes, ordem) values
  ('demo-ponto',      'Ponto do preparo', 'Escolha 1',    1, 1, 0),
  ('demo-adicionais', 'Adicionais',       'Até 3 itens',  0, 3, 1),
  ('demo-tamanho',    'Tamanho',          'Escolha 1',    1, 1, 0)
on conflict (slug) do update set
  nome       = excluded.nome,
  descricao  = excluded.descricao,
  min_opcoes = excluded.min_opcoes,
  max_opcoes = excluded.max_opcoes,
  ordem      = excluded.ordem;

insert into option_items (group_id, slug, nome, price_delta, ordem)
select g.id, v.slug, v.nome, v.delta, v.ordem
  from (values
    ('demo-ponto',      'mal',       'Mal passado',    0.00, 0),
    ('demo-ponto',      'ponto',     'Ao ponto',       0.00, 1),
    ('demo-ponto',      'bem',       'Bem passado',    0.00, 2),
    ('demo-adicionais', 'queijo',    'Queijo extra',   3.00, 0),
    ('demo-adicionais', 'bacon',     'Bacon',          5.00, 1),
    ('demo-adicionais', 'ovo',       'Ovo',            2.50, 2),
    ('demo-tamanho',    'pequeno',   'Pequeno',        0.00, 0),
    ('demo-tamanho',    'grande',    'Grande',         4.00, 1)
  ) as v(grupo, slug, nome, delta, ordem)
  join option_groups g on g.slug = v.grupo
on conflict (group_id, slug) do update set
  nome        = excluded.nome,
  price_delta = excluded.price_delta,
  ordem       = excluded.ordem;

-- -------------------------------------------------------------------- produtos
insert into products (slug, nome, descricao, preco, preco_de, category_id, destaque, ordem)
select v.slug, v.nome, v.descricao, v.preco, v.preco_de, c.id, v.destaque, v.ordem
  from (values
    ('demo-prato-1', 'Prato do dia',      'Descreva aqui o que vai no prato.',           32.90, null::numeric, 'demo-pratos',     true,  0),
    ('demo-prato-2', 'Prato executivo',   'Acompanha guarnição e salada.',               28.50, 34.90,         'demo-pratos',     true,  1),
    ('demo-prato-3', 'Opção vegetariana', 'Sem ingredientes de origem animal.',          26.00, null,          'demo-pratos',     false, 2),
    ('demo-bebida-1','Refrigerante',      'Lata ou garrafa.',                             6.90, null,          'demo-bebidas',    false, 0),
    ('demo-bebida-2','Suco natural',      'Feito na hora.',                               9.90, null,          'demo-bebidas',    false, 1),
    ('demo-doce-1',  'Sobremesa da casa', 'Pergunte o sabor do dia.',                    14.90, null,          'demo-sobremesas', false, 0)
  ) as v(slug, nome, descricao, preco, preco_de, categoria, destaque, ordem)
  join categories c on c.slug = v.categoria
on conflict (slug) do update set
  nome        = excluded.nome,
  descricao   = excluded.descricao,
  preco       = excluded.preco,
  preco_de    = excluded.preco_de,
  category_id = excluded.category_id,
  destaque    = excluded.destaque,
  ordem       = excluded.ordem;

-- ------------------------------------------------- quais opções cada item usa
insert into product_groups (product_id, group_id, ordem)
select p.id, g.id, v.ordem
  from (values
    ('demo-prato-1', 'demo-ponto',      0),
    ('demo-prato-1', 'demo-adicionais', 1),
    ('demo-prato-2', 'demo-ponto',      0),
    ('demo-bebida-1','demo-tamanho',    0),
    ('demo-bebida-2','demo-tamanho',    0)
  ) as v(produto, grupo, ordem)
  join products      p on p.slug = v.produto
  join option_groups g on g.slug = v.grupo
on conflict (product_id, group_id) do update set ordem = excluded.ordem;

-- ---------------------------------------------------------------------- cupom
insert into coupons (codigo, tipo, valor, minimo, ativo) values
  ('BEMVINDO', 'percentual', 10, 30, true)
on conflict (codigo) do update set
  tipo   = excluded.tipo,
  valor  = excluded.valor,
  minimo = excluded.minimo,
  ativo  = excluded.ativo;
