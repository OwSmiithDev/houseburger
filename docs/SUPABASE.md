# Configuração do Supabase

Passo a passo para ligar o House Burger ao banco. Leva uns 10 minutos e só
precisa ser feito uma vez.

## Antes de começar: rotacione as chaves

Se você já compartilhou a `service_role`, a `sb_secret_` ou a senha do banco em
qualquer lugar — chat, e-mail, captura de tela — **gere novas agora**:

- *Project Settings → API → Rotate* para as chaves;
- *Project Settings → Database → Reset database password* para a senha.

Essas três credenciais **ignoram todas as regras de acesso**. Quem as tiver lê,
altera e apaga qualquer coisa no banco. Elas nunca entram no código deste
projeto nem em variável de ambiente com prefixo `VITE_`.

A única chave que o aplicativo usa é a **publicável**, e ela é pública por
design: vai embutida no JavaScript entregue ao navegador. O que a torna segura
é a seção de RLS do `instalar.sql`, que limita o visitante a ler o cardápio.

---

> **Este projeto já está provisionado.** Tabelas, regras de acesso, função de
> pedido, catálogo inicial, bucket de imagens e usuário do dono já foram
> criados. Os passos abaixo servem para recriar do zero.
>
> Para **montar o sistema para outra empresa**, siga
> [REPLICAR.md](REPLICAR.md).
>
> Para trazer uma instalação existente ao estado atual do código, rode
> `supabase/atualizar.sql` — só aplica as diferenças, sem tocar em dados.

## 1. Criar o projeto

1. Em [supabase.com](https://supabase.com), crie um projeto (o plano gratuito
   basta).
2. Escolha a região mais próxima — *South America (São Paulo)* para o Brasil.
3. Guarde a senha do banco em um gerenciador de senhas. Ela não é usada pelo
   aplicativo.

## 2. Executar os scripts

No painel, abra **SQL Editor** e execute **nesta ordem**, um de cada vez:

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `supabase/instalar.sql` | Tudo: tabelas, funções, RLS, tempo real e balde de imagens |
| 2 | `supabase/seed.sql` | Carrega o cardápio do House Burger |

Antes eram quatro arquivos colados em sequência, e errar a ordem quebrava a
instalação. Agora é um só. Ambos podem ser executados de novo sem estragar
nada: usam `if not exists` e `on conflict do update`.

O `seed.sql` é gerado a partir dos dados que estavam no código, então o
cardápio já entra com os 22 produtos, 7 grupos de opções e 3 cupons. Para
**outra empresa**, não use este arquivo — veja [REPLICAR.md](REPLICAR.md).

## 3. Bucket de imagens

O `instalar.sql` já cria o balde `midia` público e as políticas de escrita.

Se ele avisar `Sem permissão para criar políticas de storage`, faça na mão em
**Storage → New bucket**: nome `midia`, *Public bucket* ligado, e em
**Policies** libere `INSERT`, `UPDATE` e `DELETE` para `authenticated`. Sem
isso o envio de fotos pelo admin é recusado.

## 4. Criar o usuário do dono

Em **Authentication → Users → Add user**:

- E-mail e senha do dono da loja
- Marque **Auto Confirm User**, senão o login fica travado esperando
  confirmação por e-mail

Não existe tela de cadastro no aplicativo, de propósito: só quem for criado
aqui entra em `/admin`.

Convém também desligar **Authentication → Providers → Email → Enable signup**,
para ninguém criar conta sozinho.

## 5. Ligar o aplicativo

Copie `.env.example` para `.env` e preencha com os dados de
*Project Settings → API*:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

O `.env` está no `.gitignore` e não vai para o repositório. Ao publicar o site,
cadastre as duas variáveis no painel do serviço de hospedagem.

```sh
npm install
npm run dev
```

Abra `http://localhost:8080` — o cardápio deve carregar do banco — e
`http://localhost:8080/admin` para entrar com o usuário criado.

---

## Como as permissões funcionam

| Quem | Catálogo, taxas, cupons | Pedidos |
|---|---|---|
| Visitante | apenas leitura do que está ativo | não lê e não escreve |
| Dono autenticado | tudo | tudo |

O visitante **não insere pedido diretamente**. Todo pedido entra pela função
`create_order`, que recalcula preços, acréscimos, cupom e taxas a partir das
tabelas e ignora qualquer valor enviado pelo navegador. É isso que impede
alguém de forjar um total editando o armazenamento local.

Consequência prática: mudar o preço no admin muda o preço de verdade, para
todos, na hora — e nenhum cliente consegue pagar diferente do que está
cadastrado.

## Manutenção

- **Trocar preços, fotos, taxas, cupons**: tudo pelo `/admin`, sem publicar
  código de novo.
- **Fechar a loja**: interruptor na tela inicial do admin. Bloqueia novos
  pedidos e o próprio banco recusa, mesmo que alguém contorne a interface.
- **Projeto pausado**: no plano gratuito, o Supabase pausa projetos sem acesso
  por cerca de uma semana. Para uma loja em operação isso não acontece; se
  acontecer, basta reativar no painel.

## Se der errado

| Sintoma | Causa provável |
|---|---|
| "Não foi possível carregar o cardápio" | `.env` ausente ou errado; ou os scripts não foram executados |
| `Could not find the table` | Falta rodar `instalar.sql` |
| Cardápio vazio, sem erro | Falta rodar `seed.sql` |
| Pedido demora a aparecer no painel | `orders` fora da publicação `supabase_realtime` — rode `atualizar.sql` |
| Login recusa a senha certa | Usuário sem *Auto Confirm* |
| Foto não envia | Bucket `midia` não existe ou está sem política de escrita |
| Admin salva mas nada muda | Sessão expirada — saia e entre de novo |
