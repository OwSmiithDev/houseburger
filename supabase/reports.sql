-- House Burger — relatórios de vendas
--
-- A agregação acontece no banco, não no navegador. Trazer todos os pedidos
-- para somar no cliente funcionaria hoje, com a base pequena, e degradaria
-- conforme a loja vendesse — além de expor pedido por pedido a quem só precisa
-- do total.
--
-- Restrito a autenticado: o visitante não tem nada que ver faturamento.

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
