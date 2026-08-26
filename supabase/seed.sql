-- House Burger — carga inicial
--
-- Gerado a partir de src/data/ para não haver divergência entre o catálogo do
-- código e o do banco. Rode depois de schema.sql e rls.sql.
-- Pode rodar de novo com segurança: tudo usa "on conflict do update".

-- ------------------------------------------------------------- configuração
insert into store_settings (
  id, nome, whatsapp, chave_pix, banner_url, avaliacao, avaliacoes,
  tempo_min, tempo_max, taxa_entrega, taxa_servico, pedido_minimo, gorjetas, aberta
) values (
  1, 'House Burger', '5562999718912', '5562999718912', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=400&fit=crop',
  4.8, '200+', 25, 40,
  8.9, 0, 25,
  '{2,3,5}', true
)
on conflict (id) do update set
  nome          = excluded.nome,
  whatsapp      = excluded.whatsapp,
  banner_url    = excluded.banner_url,
  taxa_entrega  = excluded.taxa_entrega,
  taxa_servico  = excluded.taxa_servico,
  pedido_minimo = excluded.pedido_minimo,
  gorjetas      = excluded.gorjetas;

-- ---------------------------------------------------------------- categorias
insert into categories (slug, rotulo, icone, ordem) values ('promos', 'Promoções', 'Flame', 0)
  on conflict (slug) do update set rotulo = excluded.rotulo, icone = excluded.icone, ordem = excluded.ordem;
insert into categories (slug, rotulo, icone, ordem) values ('burgers', 'Hambúrguer', 'Beef', 1)
  on conflict (slug) do update set rotulo = excluded.rotulo, icone = excluded.icone, ordem = excluded.ordem;
insert into categories (slug, rotulo, icone, ordem) values ('fries', 'Batata', 'Popcorn', 2)
  on conflict (slug) do update set rotulo = excluded.rotulo, icone = excluded.icone, ordem = excluded.ordem;
insert into categories (slug, rotulo, icone, ordem) values ('combos', 'Combos', 'UtensilsCrossed', 3)
  on conflict (slug) do update set rotulo = excluded.rotulo, icone = excluded.icone, ordem = excluded.ordem;
insert into categories (slug, rotulo, icone, ordem) values ('sodas', 'Refri', 'CupSoda', 4)
  on conflict (slug) do update set rotulo = excluded.rotulo, icone = excluded.icone, ordem = excluded.ordem;
insert into categories (slug, rotulo, icone, ordem) values ('juices', 'Sucos', 'Citrus', 5)
  on conflict (slug) do update set rotulo = excluded.rotulo, icone = excluded.icone, ordem = excluded.ordem;
insert into categories (slug, rotulo, icone, ordem) values ('creams', 'Cremes', 'IceCreamCone', 6)
  on conflict (slug) do update set rotulo = excluded.rotulo, icone = excluded.icone, ordem = excluded.ordem;

-- ---------------------------------------------------------- grupos de opções

insert into option_groups (slug, nome, min_opcoes, max_opcoes, ordem) values ('pao', 'Escolha o pão', 1, 1, 0)
  on conflict (slug) do update set nome = excluded.nome, min_opcoes = excluded.min_opcoes, max_opcoes = excluded.max_opcoes, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'brioche', 'Brioche', 0, 0 from option_groups where slug = 'pao'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'gergelim', 'Gergelim', 0, 1 from option_groups where slug = 'pao'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'australiano', 'Australiano', 3, 2 from option_groups where slug = 'pao'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'sem-gluten', 'Sem glúten', 5, 3 from option_groups where slug = 'pao'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;

insert into option_groups (slug, nome, min_opcoes, max_opcoes, ordem) values ('ponto', 'Ponto da carne', 1, 1, 1)
  on conflict (slug) do update set nome = excluded.nome, min_opcoes = excluded.min_opcoes, max_opcoes = excluded.max_opcoes, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'mal', 'Mal passada', 0, 0 from option_groups where slug = 'ponto'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'ponto', 'Ao ponto', 0, 1 from option_groups where slug = 'ponto'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'bem', 'Bem passada', 0, 2 from option_groups where slug = 'ponto'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;

insert into option_groups (slug, nome, min_opcoes, max_opcoes, ordem) values ('bebida', 'Escolha sua bebida', 1, 1, 2)
  on conflict (slug) do update set nome = excluded.nome, min_opcoes = excluded.min_opcoes, max_opcoes = excluded.max_opcoes, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'coca', 'Coca-Cola lata', 0, 0 from option_groups where slug = 'bebida'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'coca-zero', 'Coca-Cola Zero lata', 0, 1 from option_groups where slug = 'bebida'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'guarana', 'Guaraná lata', 0, 2 from option_groups where slug = 'bebida'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'suco-laranja', 'Suco de laranja 300ml', 3, 3 from option_groups where slug = 'bebida'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;

insert into option_groups (slug, nome, min_opcoes, max_opcoes, ordem) values ('adicionais', 'Adicionais', 0, 6, 3)
  on conflict (slug) do update set nome = excluded.nome, min_opcoes = excluded.min_opcoes, max_opcoes = excluded.max_opcoes, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'bacon', 'Bacon em tiras', 5, 0 from option_groups where slug = 'adicionais'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'cheddar', 'Cheddar extra', 4, 1 from option_groups where slug = 'adicionais'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'burger-extra', 'Hambúrguer extra 150g', 9, 2 from option_groups where slug = 'adicionais'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'cebola-caramelizada', 'Cebola caramelizada', 3.5, 3 from option_groups where slug = 'adicionais'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'ovo', 'Ovo frito', 3, 4 from option_groups where slug = 'adicionais'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'picles', 'Picles', 2, 5 from option_groups where slug = 'adicionais'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;

insert into option_groups (slug, nome, min_opcoes, max_opcoes, ordem) values ('remover', 'Remover ingredientes', 0, 5, 4)
  on conflict (slug) do update set nome = excluded.nome, min_opcoes = excluded.min_opcoes, max_opcoes = excluded.max_opcoes, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'sem-cebola', 'Sem cebola', 0, 0 from option_groups where slug = 'remover'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'sem-tomate', 'Sem tomate', 0, 1 from option_groups where slug = 'remover'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'sem-alface', 'Sem alface', 0, 2 from option_groups where slug = 'remover'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'sem-picles', 'Sem picles', 0, 3 from option_groups where slug = 'remover'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'sem-molho', 'Sem molho especial', 0, 4 from option_groups where slug = 'remover'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;

insert into option_groups (slug, nome, min_opcoes, max_opcoes, ordem) values ('acompanhamento', 'Escolha o acompanhamento', 1, 1, 5)
  on conflict (slug) do update set nome = excluded.nome, min_opcoes = excluded.min_opcoes, max_opcoes = excluded.max_opcoes, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'batata-p', 'Batata frita pequena', 0, 0 from option_groups where slug = 'acompanhamento'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'batata-m', 'Batata frita média', 4, 1 from option_groups where slug = 'acompanhamento'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'batata-cheddar', 'Batata com cheddar e bacon', 9, 2 from option_groups where slug = 'acompanhamento'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'onion', 'Onion rings', 7, 3 from option_groups where slug = 'acompanhamento'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;

insert into option_groups (slug, nome, min_opcoes, max_opcoes, ordem) values ('tamanho', 'Tamanho', 1, 1, 6)
  on conflict (slug) do update set nome = excluded.nome, min_opcoes = excluded.min_opcoes, max_opcoes = excluded.max_opcoes, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'lata', 'Lata 350ml', 0, 0 from option_groups where slug = 'tamanho'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'garrafa-600', 'Garrafa 600ml', 3, 1 from option_groups where slug = 'tamanho'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;
insert into option_items (group_id, slug, nome, price_delta, ordem)
  select id, 'litro', '1 litro', 5, 2 from option_groups where slug = 'tamanho'
  on conflict (group_id, slug) do update set nome = excluded.nome, price_delta = excluded.price_delta, ordem = excluded.ordem;

-- ------------------------------------------------------------------ produtos

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'promo-1', 'Combo Super Economia', 'X-Bacon + batata média + refrigerante lata', 29.9, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop', c.id, true, 0
  from categories c where c.slug = 'promos'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'promo-1' and g.slug = 'pao'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 1 from products p, option_groups g
  where p.slug = 'promo-1' and g.slug = 'ponto'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 2 from products p, option_groups g
  where p.slug = 'promo-1' and g.slug = 'bebida'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 3 from products p, option_groups g
  where p.slug = 'promo-1' and g.slug = 'adicionais'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'promo-2', 'Dupla Feliz', 'Dois X-Salada por um preço especial', 34.9, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop', c.id, true, 1
  from categories c where c.slug = 'promos'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'promo-2' and g.slug = 'pao'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 1 from products p, option_groups g
  where p.slug = 'promo-2' and g.slug = 'ponto'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 2 from products p, option_groups g
  where p.slug = 'promo-2' and g.slug = 'remover'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'burger-1', 'X-Bacon Especial', 'Pão brioche, blend 180g, bacon crocante, queijo cheddar, alface e tomate', 28.9, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop', c.id, true, 2
  from categories c where c.slug = 'burgers'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'burger-1' and g.slug = 'pao'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 1 from products p, option_groups g
  where p.slug = 'burger-1' and g.slug = 'ponto'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 2 from products p, option_groups g
  where p.slug = 'burger-1' and g.slug = 'adicionais'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 3 from products p, option_groups g
  where p.slug = 'burger-1' and g.slug = 'remover'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'burger-2', 'X-Salada Classic', 'Pão de gergelim, blend 150g, queijo, alface, tomate e maionese da casa', 22.9, 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop', c.id, false, 3
  from categories c where c.slug = 'burgers'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'burger-2' and g.slug = 'pao'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 1 from products p, option_groups g
  where p.slug = 'burger-2' and g.slug = 'ponto'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 2 from products p, option_groups g
  where p.slug = 'burger-2' and g.slug = 'adicionais'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 3 from products p, option_groups g
  where p.slug = 'burger-2' and g.slug = 'remover'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'burger-3', 'Duplo Cheddar', 'Dois blends de 150g, cheddar duplo, cebola caramelizada e molho especial', 36.9, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop', c.id, true, 4
  from categories c where c.slug = 'burgers'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'burger-3' and g.slug = 'pao'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 1 from products p, option_groups g
  where p.slug = 'burger-3' and g.slug = 'ponto'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 2 from products p, option_groups g
  where p.slug = 'burger-3' and g.slug = 'adicionais'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 3 from products p, option_groups g
  where p.slug = 'burger-3' and g.slug = 'remover'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'burger-4', 'Veggie Burger', 'Hambúrguer de grão-de-bico, queijo, rúcula e tomate seco', 26.9, 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&h=300&fit=crop', c.id, false, 5
  from categories c where c.slug = 'burgers'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'burger-4' and g.slug = 'pao'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 1 from products p, option_groups g
  where p.slug = 'burger-4' and g.slug = 'remover'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'fries-1', 'Batata Frita Pequena', 'Porção individual de batatas sequinhas', 9.9, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop', c.id, false, 6
  from categories c where c.slug = 'fries'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'fries-2', 'Batata Frita Média', 'Porção média de batatas fritas sequinhas', 12.9, 'https://s2-g1.glbimg.com/CKfwlPmqh90d1QnEy2V1Ev8QFOA=/0x0:520x370/984x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_59edd422c0c84a879bd37670ae4f538a/internal_photos/bs/2022/L/M/BAjY2OQK6OwH9uCXKqiQ/batata-frita-canva.jpg', c.id, false, 7
  from categories c where c.slug = 'fries'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'fries-3', 'Batata com Cheddar e Bacon', 'Batata frita coberta com cheddar cremoso e bacon crocante', 19.9, 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=400&h=300&fit=crop', c.id, true, 8
  from categories c where c.slug = 'fries'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'fries-4', 'Onion Rings', 'Anéis de cebola empanados e crocantes', 16.9, 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop', c.id, false, 9
  from categories c where c.slug = 'fries'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'combo-1', 'Combo X-Bacon', 'X-Bacon com acompanhamento e bebida à sua escolha', 39.9, 'https://images.unsplash.com/photo-1610614819513-58e34989848b?w=400&h=300&fit=crop', c.id, false, 10
  from categories c where c.slug = 'combos'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'combo-1' and g.slug = 'pao'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 1 from products p, option_groups g
  where p.slug = 'combo-1' and g.slug = 'ponto'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 2 from products p, option_groups g
  where p.slug = 'combo-1' and g.slug = 'acompanhamento'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 3 from products p, option_groups g
  where p.slug = 'combo-1' and g.slug = 'bebida'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 4 from products p, option_groups g
  where p.slug = 'combo-1' and g.slug = 'adicionais'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'combo-2', 'Combo Duplo', 'Duplo Cheddar com acompanhamento e bebida à sua escolha', 47.9, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop', c.id, true, 11
  from categories c where c.slug = 'combos'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'combo-2' and g.slug = 'pao'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 1 from products p, option_groups g
  where p.slug = 'combo-2' and g.slug = 'ponto'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 2 from products p, option_groups g
  where p.slug = 'combo-2' and g.slug = 'acompanhamento'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 3 from products p, option_groups g
  where p.slug = 'combo-2' and g.slug = 'bebida'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 4 from products p, option_groups g
  where p.slug = 'combo-2' and g.slug = 'adicionais'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'combo-3', 'Combo Família', 'Quatro hambúrgueres, duas batatas grandes e refrigerante de 2 litros', 119.9, 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop', c.id, false, 12
  from categories c where c.slug = 'combos'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'combo-3' and g.slug = 'ponto'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 1 from products p, option_groups g
  where p.slug = 'combo-3' and g.slug = 'adicionais'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'soda-1', 'Coca-Cola', 'Refrigerante gelado', 6.9, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop', c.id, false, 13
  from categories c where c.slug = 'sodas'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'soda-1' and g.slug = 'tamanho'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'soda-2', 'Guaraná Antarctica', 'Refrigerante gelado', 6.5, 'https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?w=400&h=300&fit=crop', c.id, false, 14
  from categories c where c.slug = 'sodas'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'soda-2' and g.slug = 'tamanho'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'soda-3', 'Sprite', 'Refrigerante gelado', 6.5, 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=300&fit=crop', c.id, false, 15
  from categories c where c.slug = 'sodas'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;
insert into product_groups (product_id, group_id, ordem)
  select p.id, g.id, 0 from products p, option_groups g
  where p.slug = 'soda-3' and g.slug = 'tamanho'
  on conflict (product_id, group_id) do update set ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'juice-1', 'Suco de Laranja', 'Natural, feito na hora, 500ml', 11.9, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop', c.id, false, 16
  from categories c where c.slug = 'juices'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'juice-2', 'Suco de Morango', 'Natural, 500ml', 13.9, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop', c.id, false, 17
  from categories c where c.slug = 'juices'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'juice-3', 'Limonada Suíça', 'Limão batido com leite condensado, 500ml', 12.9, 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop', c.id, false, 18
  from categories c where c.slug = 'juices'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'cream-1', 'Milkshake de Chocolate', 'Sorvete batido com calda de chocolate, 400ml', 17.9, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop', c.id, true, 19
  from categories c where c.slug = 'creams'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'cream-2', 'Milkshake de Morango', 'Sorvete batido com morango, 400ml', 17.9, 'https://images.unsplash.com/photo-1586917049352-bd32c1edd8e6?w=400&h=300&fit=crop', c.id, false, 20
  from categories c where c.slug = 'creams'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;

insert into products (slug, nome, descricao, preco, image_url, category_id, destaque, ordem)
  select 'cream-3', 'Petit Gateau', 'Bolo quente de chocolate com sorvete de creme', 21.9, 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop', c.id, false, 21
  from categories c where c.slug = 'creams'
  on conflict (slug) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    image_url = excluded.image_url, destaque = excluded.destaque, ordem = excluded.ordem;

-- -------------------------------------------------------------------- cupons
insert into coupons (codigo, descricao, tipo, valor, min_subtotal) values ('PRIMEIRA10', '10% de desconto na primeira compra', 'percent', 0.1, 30)
  on conflict (codigo) do update set descricao = excluded.descricao, tipo = excluded.tipo, valor = excluded.valor, min_subtotal = excluded.min_subtotal;
insert into coupons (codigo, descricao, tipo, valor, min_subtotal) values ('BURGER5', 'R$ 5,00 de desconto', 'fixed', 5, 40)
  on conflict (codigo) do update set descricao = excluded.descricao, tipo = excluded.tipo, valor = excluded.valor, min_subtotal = excluded.min_subtotal;
insert into coupons (codigo, descricao, tipo, valor, min_subtotal) values ('FRETEGRATIS', 'Entrega grátis', 'shipping', 0, 60)
  on conflict (codigo) do update set descricao = excluded.descricao, tipo = excluded.tipo, valor = excluded.valor, min_subtotal = excluded.min_subtotal;
