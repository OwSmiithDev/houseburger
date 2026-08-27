# Montar o sistema para outra empresa

Passo a passo para colocar este mesmo aplicativo no ar para um novo cliente,
com banco próprio e dados próprios. Leva cerca de 20 minutos.

Cada empresa fica **totalmente separada**: projeto Supabase próprio, banco
próprio, usuário próprio. Não há dado compartilhado entre elas, e um problema
numa não afeta as outras.

---

## Antes de começar

Decida três coisas que aparecem na comanda e no aplicativo:

| O quê | Exemplo | Onde muda depois |
|---|---|---|
| Nome da loja | `Pizzaria do Léo` | `/admin` → Loja |
| Sigla do pedido | `PZL` → comandas `PZL-4F2A` | `/admin` → Loja |
| WhatsApp que recebe os pedidos | `5562999999999` | `/admin` → Loja |

A sigla vale a pena escolher antes: mudá-la depois faz os pedidos novos saírem
com prefixo diferente dos antigos, no meio do histórico.

---

## 1. Criar o projeto no Supabase

1. Em [supabase.com](https://supabase.com), crie um projeto novo (o plano
   gratuito atende uma loja pequena).
2. Região: a mais próxima do cliente — *South America (São Paulo)* no Brasil.
3. Guarde a senha do banco num gerenciador de senhas. O aplicativo não a usa;
   ela serve para acesso direto ao Postgres.

## 2. Rodar o instalador

**SQL Editor → New query**, cole o conteúdo de
[`supabase/instalar.sql`](../supabase/instalar.sql) inteiro e execute.

Um arquivo só, na ordem certa. Ele cria:

| Seção | O que cria |
|---|---|
| 1 | Tabelas e índices |
| 2 | Código do pedido, distância e cálculo da taxa |
| 3 e 4 | `create_order` e `consultar_pedido` |
| 5 | Funções dos relatórios de vendas |
| 6 | Regras de acesso (RLS) |
| 7 | Transmissão em tempo real dos pedidos |
| 8 | Balde `midia` para as imagens, com as políticas |
| 9 | A linha de configuração da loja |

Pode ser executado de novo sem estragar nada.

> Se a seção 8 avisar `Sem permissão para criar políticas de storage`, crie o
> balde na mão: **Storage → New bucket**, nome `midia`, *Public bucket* ligado,
> e em **Policies** libere `INSERT`, `UPDATE` e `DELETE` para `authenticated`.

## 3. Cardápio de demonstração (opcional)

Para a loja abrir já funcionando, rode
[`supabase/exemplo.sql`](../supabase/exemplo.sql): três categorias e seis
produtos genéricos, um deles com opções obrigatórias, para o dono ver o
formato antes de cadastrar o dele.

O próprio arquivo traz, no cabeçalho, o comando para apagar a demonstração
depois.

## 4. Criar o usuário do dono

**Authentication → Users → Add user**:

- E-mail e senha do dono
- Marque **Auto Confirm User** — sem isso o login trava esperando confirmação
  por e-mail que nunca chega

Depois, desligue **Authentication → Providers → Email → Enable signup**. Não
existe tela de cadastro no aplicativo, de propósito: só quem for criado aqui
entra em `/admin`.

## 5. Preencher os dados da loja

Duas opções.

**Pelo painel** (recomendado): entre em `/admin` → **Loja** e preencha nome,
sigla, WhatsApp, chave Pix, endereço, horário, taxas e pedido mínimo. O
endereço tem um mapa para marcar o ponto exato, que é a origem do cálculo de
distância.

**Por SQL**: no fim do `instalar.sql` há um `UPDATE` comentado com todos os
campos. Descomente, ajuste e execute.

## 6. Ligar o aplicativo ao banco

Em **Project Settings → API**, copie a URL e a chave publicável para o `.env`:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

```sh
npm install
npm run dev
```

> **Só estas duas variáveis.** As chaves `service_role` e `sb_secret_` ignoram
> todas as regras de acesso e **nunca** entram no código nem em variável com
> prefixo `VITE_` — tudo que tem esse prefixo é entregue ao navegador.

## 7. Publicar

Suba o repositório para o serviço de hospedagem (Vercel, Netlify, Cloudflare
Pages) e cadastre as mesmas duas variáveis lá. O `.env` está no `.gitignore` e
não vai junto.

---

## Lista de verificação

Antes de entregar ao cliente, faça um pedido de verdade e confira:

- [ ] O cardápio carrega e as fotos aparecem
- [ ] Adicionar um produto com opção obrigatória trava o botão até escolher
- [ ] O pedido mínimo bloqueia um carrinho pequeno
- [ ] O checkout calcula a taxa de entrega pela distância marcada no mapa
- [ ] O WhatsApp abre com a comanda preenchida
- [ ] O cliente cai na tela de acompanhamento e vê o pedido
- [ ] **O pedido aparece no `/admin` em segundos**, sem recarregar a página
- [ ] O alarme toca e insiste enquanto o pedido está pendente
- [ ] Marcar "preparando" silencia o alarme e muda o status no aplicativo do cliente
- [ ] A comanda impressa sai com a sigla certa da empresa
- [ ] Os relatórios mostram o pedido

Se o pedido demorar meio minuto para aparecer no painel, a seção 7 do
instalador não pegou — confira se a tabela `orders` está em
**Database → Publications → supabase_realtime**.

Deu tudo certo? Rode [`supabase/limpar-pedidos.sql`](../supabase/limpar-pedidos.sql)
para o cliente receber a loja sem os pedidos da sua conferência. **Não tem
volta** e os relatórios voltam a zero — que é justamente o que se quer aqui.

---

## O que não é replicável por SQL

| Passo | Por quê |
|---|---|
| Usuário do dono | Vive no schema `auth`, gerenciado pelo Supabase |
| Desligar cadastro público | Configuração do projeto, não do banco |
| Variáveis do `.env` | Ficam na hospedagem, não no banco |
| Domínio próprio | Configuração da hospedagem |

---

## Atualizar uma empresa que já está no ar

Quando o código ganhar recursos que dependem do banco, rode
[`supabase/atualizar.sql`](../supabase/atualizar.sql) no projeto dela. Ele só
aplica as diferenças e não toca em dado nenhum.

Instalações novas não precisam: o `instalar.sql` já vem completo.

---

## Manutenção do dia a dia

- **Preços, fotos, taxas, cupons, horário**: tudo em `/admin`, sem publicar
  código.
- **Fechar a loja**: interruptor na tela inicial do admin. O banco recusa
  pedidos mesmo que alguém contorne a interface.
- **Projeto pausado**: no plano gratuito o Supabase pausa projetos sem acesso
  por cerca de uma semana. Numa loja em operação não acontece; se acontecer,
  reative pelo painel.
- **Zerar os pedidos**: `supabase/limpar-pedidos.sql`. Apaga todos os pedidos e
  seus itens, sem confirmação e sem cópia; o faturamento dos relatórios vai
  junto. Catálogo, cupons e configuração ficam intactos.

## Se der errado

| Sintoma | Causa provável |
|---|---|
| "Não foi possível carregar o cardápio" | `.env` errado, ou o `instalar.sql` não rodou |
| `Could not find the table` | O `instalar.sql` não rodou |
| Cardápio vazio, sem erro | Falta cadastrar produtos (ou rodar `exemplo.sql`) |
| Login recusa a senha certa | Usuário criado sem *Auto Confirm* |
| Foto não envia | Balde `midia` sem política de escrita |
| Pedido demora a aparecer no painel | `orders` fora da publicação `supabase_realtime` |
| Comanda com a sigla errada | `prefixo_codigo` em `/admin` → Loja |
| Admin salva mas nada muda | Sessão expirada — saia e entre de novo |
