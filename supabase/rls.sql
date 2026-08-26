-- House Burger — regras de acesso (Row Level Security)
--
-- A chave publicável usada pelo aplicativo vai embutida no JavaScript e
-- qualquer visitante consegue lê-la. Ela só é segura por causa deste arquivo:
-- é aqui que o banco define que o visitante apenas LÊ o catálogo, e nada mais.
--
-- Regra geral:
--   anon           -> SELECT do que está ativo, e só isso
--   authenticated  -> tudo (é o dono, logado pelo Supabase Auth)
--   pedidos        -> anon não lê nem escreve; entram apenas pela função
--                     create_order, que valida os valores
--
-- Cole no editor SQL depois de schema.sql.

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
