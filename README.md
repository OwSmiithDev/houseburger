# House Burger

Cardápio digital para pedidos. O cliente monta o pedido no celular e envia a
comanda para o WhatsApp da loja; o dono administra cardápio, preços, taxas e
pedidos por um painel próprio, sem tocar em código.

Mobile-first: praticamente todo o acesso vem de celular, e as decisões de
interface partem daí.

## Telas

Capturas do aplicativo em execução, em viewport de celular (390 × 844).

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/01-cardapio.jpg" width="200" alt="Cardápio com vitrine de destaques e categorias"><br><sub><b>Cardápio</b></sub></td>
    <td align="center"><img src="docs/screenshots/02-personalizacao.jpg" width="200" alt="Grupos de opções obrigatórias do produto"><br><sub><b>Personalização</b></sub></td>
    <td align="center"><img src="docs/screenshots/03-sacola.jpg" width="200" alt="Sacola com as escolhas listadas e cupom"><br><sub><b>Sacola</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/04-checkout.jpg" width="200" alt="Resumo com taxas, gorjeta e total"><br><sub><b>Checkout</b></sub></td>
    <td align="center"><img src="docs/screenshots/05-mapa.jpg" width="200" alt="Mapa com marcador arrastável"><br><sub><b>Endereço no mapa</b></sub></td>
    <td align="center"><img src="docs/screenshots/06-admin.jpg" width="200" alt="Painel administrativo com a lista de produtos"><br><sub><b>Administração</b></sub></td>
  </tr>
</table>

## Como funciona

1. **Loja** — vitrine de mais pedidos, busca e navegação por categoria.
2. **Produto** — grupos de personalização com mínimo e máximo. Enquanto houver
   grupo obrigatório pendente o botão fica travado, com o motivo visível e
   clicável, levando direto ao grupo que falta.
3. **Sacola** — cada linha mostra o que foi escolhido, porque o mesmo produto
   com opções diferentes são pedidos diferentes. Cupom e talheres aqui.
4. **Checkout** — retirada ou entrega, dados, gorjeta e o resumo com as contas
   abertas: subtotal, desconto, taxa de entrega, taxa de serviço e total.
5. **Registro e comanda** — o pedido é gravado no banco, que recalcula os
   valores, e a comanda sai formatada para o WhatsApp da cozinha.

O dono acompanha os pedidos e edita o cardápio em `/admin`.

## Stack

| Camada | Escolha |
|---|---|
| Build | Vite 7 |
| UI | React 18 + TypeScript |
| Estilo | Tailwind CSS 3 + shadcn/ui |
| Rotas | React Router 7 |
| Dados e autenticação | Supabase (Postgres + Auth + Storage) |
| Mapa | Leaflet + OpenStreetMap |
| Ícones | lucide-react |

## Rodando localmente

Requer **Node.js 20.19+ ou 22.12+** — o Vite 7 declara
`^20.19.0 || >=22.12.0`, então a linha 21.x fica de fora.

O banco precisa estar configurado antes: veja [docs/SUPABASE.md](docs/SUPABASE.md).
Depois copie `.env.example` para `.env` e preencha as duas variáveis.

```sh
npm install
npm run dev
```

O servidor sobe em `http://localhost:8080` e também escuta na rede local — o
endereço `Network:` que aparece no terminal permite abrir o app no celular,
que é onde ele deve ser testado de verdade.

> **O GPS não funciona pelo endereço da rede.** A API de geolocalização só
> opera em contexto seguro: HTTPS ou `localhost`. Abrindo por
> `http://192.168.x.x`, o botão de localização avisa que é preciso HTTPS —
> mas o mapa continua utilizável arrastando o marcador, que é o caminho
> principal de qualquer forma.

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção em `dist/` |
| `npm run build:dev` | Build sem minificação, para depurar |
| `npm run preview` | Serve o `dist/` já construído |
| `npm run lint` | ESLint |

### Testes end-to-end

Os testes de interface, de intrusão e de auditoria da comanda são escritos em
Python com Playwright — por isso o `requirements.txt` na raiz:

```sh
python -m venv .venv
.venv\Scripts\activate           # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

## Estrutura

```
supabase/                       scripts SQL do banco
├── schema.sql                  tabelas, localização e taxa por distância
├── rls.sql                     quem pode ler e escrever
├── functions.sql               create_order, a validação do pedido
└── seed.sql                    carga inicial do cardápio

src/
├── pages/                      uma rota por arquivo
│   ├── Store.tsx               /              cardápio
│   ├── Product.tsx             /produto/:id   personalização
│   ├── Cart.tsx                /sacola
│   ├── Checkout.tsx            /checkout
│   ├── Payment.tsx             /pagamento
│   ├── Address.tsx             /endereco      mapa (sob demanda)
│   └── admin/                  /admin/*       painel da loja
├── components/
│   ├── base/                   BottomBar, AppBar, Stepper, primitives
│   ├── store/                  StoreHero, CategoryChips, ProductRow, carrossel
│   ├── product/                OptionGroupField
│   ├── admin/                  AdminShell, CampoImagem, SeletorLocal
│   └── CatalogGate.tsx         bloqueia o cliente sem cardápio carregado
├── store/
│   ├── cart.tsx                sacola, única no app e persistida
│   └── checkout.tsx            dados do pedido, só em memória
├── lib/
│   ├── api.ts                  leitura do catálogo e envio do pedido
│   ├── supabase.ts             cliente completo, só para o admin
│   ├── admin-api.ts            escritas do painel
│   ├── pricing.ts              cálculo do pedido e da taxa por distância
│   ├── orders.ts               chamada de create_order
│   └── whatsapp.ts             montagem e limpeza da comanda
├── data/catalog.ts             busca o cardápio do banco
└── types/order.ts              tipos do domínio
```

As rotas usam `React.lazy`. É o que mantém o Leaflet (~46 KB comprimidos) e o
`supabase-js` completo (~53 KB) fora do carregamento inicial: quem só quer pedir
um lanche baixa 117 KB.

## Configuração

Tudo se ajusta pelo `/admin`, sem publicar código:

| Tela | O que controla |
|---|---|
| **Loja** | Nome, logo, banner, endereço e ponto no mapa, WhatsApp, chave Pix, taxas, pedido mínimo, gorjetas |
| **Produtos** | Cardápio, preços, fotos, categoria, destaque, esgotado e quais grupos de opções cada item usa |
| **Opções** | Grupos de personalização, mínimo, máximo e o acréscimo de cada escolha |
| **Cupons** | Percentual, valor fixo ou entrega grátis, com subtotal mínimo |
| **Pedidos** | Acompanhamento e mudança de status |

No código só ficam as duas variáveis de ambiente em `.env`.

### Endereço da loja e retirada

O endereço cadastrado aparece no cabeçalho do cardápio e na tela de checkout
quando o cliente escolhe retirar, com link para abrir no mapa. O mesmo endereço
vai na comanda do WhatsApp, para servir de comprovante a quem não olhou o
cardápio.

### Taxa de entrega por distância

Em **Loja → Entrega e taxas** há dois modos:

- **Taxa única** — o mesmo valor para toda entrega.
- **Por distância** — `valor base + valor por km × distância`, medida em linha
  reta entre o ponto da loja e o ponto marcado pelo cliente. Um raio máximo
  opcional recusa pedidos além dele.

A tela mostra uma simulação para 1, 3, 5 e 10 km antes de salvar.

Duas consequências que valem entender:

- **É distância de mapa, não de rua.** O trajeto real costuma ser 20 a 40%
  maior; considere isso ao escolher o valor por quilômetro. Medir rota exigiria
  uma API paga com chave.
- **No modo por distância o ponto no mapa vira obrigatório** para entrega. Sem
  ele não há o que medir, e cair na taxa fixa premiaria quem não marcasse. O
  checkout avisa e leva ao mapa; o banco recusa o pedido de qualquer forma.

### Editando a comanda do WhatsApp

A mensagem montada em `src/lib/whatsapp.ts` é **texto simples**, lido na correria
da cozinha em aparelhos variados e com fontes incompletas. Ela já chegou
corrompida uma vez, com fileiras de `?` no lugar dos separadores e um `?` dentro
de cada preço. Ao mexer nela:

- **Use apenas ASCII e acentos.** Os separadores são hifens por isso. Traços de
  desenho de caixa como `━` (U+2501) faltam em muitas fontes de sistema.
- **Evite emoji.** Dependem de fonte colorida instalada, e alguns arrastam junto
  o seletor de variação U+FE0F, que vira um quadrado sozinho. O negrito do
  próprio WhatsApp, com `*asteriscos*`, já dá hierarquia suficiente.
- **Não confie no `Intl` para preços.** Ele separa `R$` do valor com espaço
  inseparável; `formatPrice` já normaliza isso.

`limparParaWhatsApp` é a última barreira antes do envio e remove espaços
inseparáveis, seletores de variação e marcas invisíveis de direção que podem
entrar por colagem no nome ou no endereço.

## Decisões de interface

O app é usado com uma mão, em movimento, muitas vezes com a tela suja de
gordura. Isso define as regras:

- **Rotas de verdade, não estado.** Sacola e checkout são endereços próprios, e
  o botão voltar do sistema fecha a tela certa em vez de sair do aplicativo.
- **Áreas seguras.** `viewport-fit=cover` no HTML e tokens `--safe-*` derivados
  de `env(safe-area-inset-*)`. Sem isso a barra fixa cai embaixo do indicador de
  gestos do iPhone e da barra de navegação do Android.
- **A barra inferior se mede.** Sua altura muda conforme aparece o aviso de
  pedido mínimo, de grupo pendente ou de área de entrega, então ela publica a
  altura real em `--bar-h` e o conteúdo reserva esse espaço.
- **Alvos de toque de 44px no mínimo** em todo controle (WCAG 2.5.5).
- **Sem depender de `hover`.** Estados de pressão usam `.press` / `.press-sm`,
  que recuam o elemento sem deslocar o layout ao redor.
- **Botão travado explica o motivo** — grupo obrigatório pendente, loja fechada,
  fora da área de entrega — e, quando dá, leva ao que resolve.
- **`prefers-reduced-motion`** desliga animações em laço e transformações.
- **`h-dvh` em vez de `100vh`**, que no mobile conta a barra do navegador.
- **Sem cardápio, sem pedido.** Se o banco não responde, o app mostra
  indisponibilidade em vez de preços que podem estar velhos.

## Modelo de confiança

O cliente envia ao servidor **apenas identificadores e quantidades**. Nenhum
preço, subtotal, taxa ou desconto sai do navegador.

Todo pedido entra pela função `create_order`, que recalcula do zero a partir das
tabelas: preço base, acréscimo de cada opção, cupom, taxa de entrega (inclusive
por distância), taxa de serviço e pedido mínimo. A comanda do WhatsApp é montada
do que essa função devolve. Editar o armazenamento local não muda o que a
cozinha recebe.

As permissões vivem em `supabase/rls.sql`:

| Quem | Catálogo, taxas, cupons | Pedidos |
|---|---|---|
| Visitante | apenas leitura do que está ativo | não lê e não escreve |
| Dono autenticado | tudo | tudo |

A chave publicável vai embutida no JavaScript — isso é esperado. Ela só é segura
porque as regras acima limitam o que o visitante pode fazer. Chaves de servidor
(`service_role`, `sb_secret_`) nunca entram no código nem em variável com
prefixo `VITE_`.

A sacola persistida guarda só identificadores; nome, preço e acréscimos são
relidos do catálogo a cada carga. A leitura valida produto, grupo, opção,
limites de quantidade e o cupom, e descarta sacolas com mais de 12 horas.

**Endereço e geolocalização do cliente não são persistidos** no navegador: os
dados do checkout vivem só em memória.

**Cupons validados no cliente são conveniência, não defesa** — o desconto real é
o que o servidor calcula ao registrar o pedido.

## Licença

Projeto privado.
