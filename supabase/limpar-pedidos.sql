-- ============================================================================
-- Apagar todos os pedidos
-- ============================================================================
--
-- Cole no editor SQL do Supabase e execute. Zera a tabela de pedidos e os
-- itens de cada um.
--
-- NÃO TEM VOLTA. Não há cópia de segurança nem confirmação: rodou, apagou.
-- Os relatórios de vendas voltam a zero junto, porque leem daqui.
--
-- Serve para limpar os pedidos de teste antes de entregar uma instalação nova,
-- ou para zerar a base depois de um período de experiência.
--
-- O que NÃO é tocado: catálogo, produtos, grupos de opções, cupons e a
-- configuração da loja. Só os pedidos saem.
-- ============================================================================

/*
 * `order_items` tem `on delete cascade` na referência a `orders`, então os
 * itens saem junto. Apagá-los numa linha à parte seria redundante e passaria a
 * impressão errada de que a cascata não existe.
 *
 * `delete` e não `truncate`: o truncate exige bloqueio exclusivo da tabela e,
 * com `cascade`, alcançaria em silêncio qualquer tabela futura que venha a
 * referenciar `orders`. No volume de uma hamburgueria o delete não custa nada.
 */
delete from orders;

-- Confirmação: as duas contagens têm de vir zeradas. Sem este select o editor
-- responde só "Success", que é indistinguível de um comando que não pegou nada.
select
  (select count(*) from orders)      as pedidos_restantes,
  (select count(*) from order_items) as itens_restantes;
