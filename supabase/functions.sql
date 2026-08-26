-- House Burger — criação de pedido validada no banco
--
-- Desde o início do projeto o total era somado no navegador e enviado ao
-- WhatsApp, o que permitia forjar valores editando o armazenamento local.
-- Esta função encerra isso: ela IGNORA qualquer preço vindo do cliente e
-- recalcula tudo a partir das tabelas.
--
-- O cliente manda apenas identificadores e quantidades. Volta o pedido com os
-- valores verdadeiros, e é desse retorno que a comanda é montada.
--
-- security definer: roda com os privilégios do dono da função, o que permite
-- inserir em `orders` mesmo sem o visitante ter permissão direta na tabela.

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
  v_gorjeta        numeric(10,2) := 0;
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
    v_taxa_entrega := cfg.taxa_entrega;
  end if;

  -- O cupom é buscado pelo código; o desconto que o cliente calculou é ignorado.
  if coalesce(payload->>'cupom_codigo','') <> '' then
    select * into cupom from coupons
      where upper(codigo) = upper(payload->>'cupom_codigo') and ativo;
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

  -- Gorjeta é o único valor que vem do cliente, porque é escolha dele.
  -- Ainda assim entra limitada, para um valor absurdo não poluir o histórico.
  v_gorjeta := greatest(0, least(coalesce((payload->>'gorjeta')::numeric, 0), 200));

  v_total := greatest(0, v_subtotal - v_desconto + v_taxa_entrega + v_taxa_servico + v_gorjeta);

  if v_pagamento = 'cash' then
    v_troco := (payload->>'troco_para')::numeric;
    if v_troco is not null and v_troco < v_total then
      raise exception 'Troco menor que o total do pedido';
    end if;
  end if;

  update orders set
    subtotal = v_subtotal, desconto = v_desconto, taxa_entrega = v_taxa_entrega,
    taxa_servico = v_taxa_servico, gorjeta = v_gorjeta, total = v_total,
    troco_para = v_troco
  where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id, 'codigo', v_codigo, 'itens', v_itens,
    'subtotal', v_subtotal, 'desconto', v_desconto,
    'taxa_entrega', v_taxa_entrega, 'entrega_gratis', v_entrega_gratis,
    'taxa_servico', v_taxa_servico, 'gorjeta', v_gorjeta,
    'total', v_total, 'troco_para', v_troco
  );
end;
$$;

-- O visitante só pode chamar esta função; escrever em orders continua vedado.
revoke all on function create_order(jsonb) from public;
grant execute on function create_order(jsonb) to anon, authenticated;
