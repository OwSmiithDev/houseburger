# House Burger

Cardápio digital para pedidos. O cliente monta o pedido no celular e envia direto
para o WhatsApp da hamburgueria — não há backend, cadastro nem pagamento online.

Mobile-first: praticamente todo o acesso vem de celular, e as decisões de
interface partem daí.

## Telas

Capturas do aplicativo em execução, em viewport de celular (390 × 844).

| Cardápio | Personalização | Sacola |
|---|---|---|
| ![Loja com vitrine de destaques e categorias](docs/screenshots/01-cardapio.jpg) | ![Grupos de opções obrigatórias do produto](docs/screenshots/02-personalizacao.jpg) | ![Sacola com as escolhas listadas e cupom](docs/screenshots/03-sacola.jpg) |

| Checkout | Endereço |
|---|---|
| ![Resumo com taxas, gorjeta e total](docs/screenshots/04-checkout.jpg) | ![Mapa com marcador arrastável](docs/screenshots/05-mapa.jpg) |

## Como funciona

1. **Loja** — vitrine de mais pedidos, busca e navegação por categoria.
2. **Produto** — grupos de personalização com mínimo e máximo. Enquanto houver
   grupo obrigatório pendente o botão fica travado, com o motivo visível e
   clicável, levando direto ao grupo que falta.
3. **Sacola** — cada linha mostra o que foi escolhido, porque o mesmo produto
   com opções diferentes são pedidos diferentes. Cupom e talheres aqui.
4. **Checkout** — retirada ou entrega, dados, gorjeta e o resumo com as contas
   abertas: subtotal, desconto, taxa de entrega, taxa de serviço e total.
5. **WhatsApp** — a comanda sai formatada para a cozinha.

## Stack

| Camada | Escolha |
|---|---|
| Build | Vite 7 |
| UI | React 18 + TypeScript |
| Estilo | Tailwind CSS 3 + shadcn/ui |
| Rotas | React Router 7 |
| Mapa | Leaflet + OpenStreetMap |
| Ícones | lucide-react |
| Notificações | sonner |

## Rodando localmente

Requer **Node.js 20.19+ ou 22.12+** — o Vite 7 declara
`^20.19.0 || >=22.12.0`, então a linha 21.x fica de fora.

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
> principal de qualquer forma. Todo o restante da interface pode ser testado
> pela rede sem ressalva.

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
src/
├── pages/                      uma rota por arquivo
│   ├── Store.tsx               /              cardápio
│   ├── Product.tsx             /produto/:id   personalização
│   ├── Cart.tsx                /sacola
│   ├── Checkout.tsx            /checkout
│   ├── Payment.tsx             /pagamento
│   └── Address.tsx             /endereco      mapa (carregado sob demanda)
├── components/
│   ├── base/                   BottomBar, AppBar, Stepper, primitives
│   ├── store/                  StoreHero, CategoryChips, ProductRow, carrossel
│   └── product/                OptionGroupField
├── store/
│   ├── cart.tsx                carrinho, único no app e persistido
│   └── checkout.tsx            dados do pedido, só em memória
├── lib/
│   ├── pricing.ts              todo o cálculo do pedido
│   ├── whatsapp.ts             montagem e limpeza da comanda
│   ├── format.ts               preço em BRL
│   └── haptics.ts              feedback tátil
├── data/
│   ├── products.ts             catálogo e grupos de opções
│   ├── config.ts               taxas, mínimo, dados da loja
│   └── coupons.ts              cupons aceitos
└── types/order.ts              tipos do domínio
```

As rotas usam `React.lazy`. É o que mantém o Leaflet (~45 KB comprimidos) fora
do carregamento inicial: só quem abre `/endereco` paga esse custo.

## Configuração

Não há variáveis de ambiente. O que se ajusta fica em três arquivos:

- **`src/data/config.ts`** — número do WhatsApp, taxa de entrega, taxa de
  serviço, pedido mínimo, sugestões de gorjeta e dados exibidos da loja.
  **Os valores atuais são exemplos** e precisam ser trocados pelos reais.
- **`src/data/products.ts`** — catálogo e grupos de personalização. Cada
  produto precisa de `id` único e `category` correspondente a uma chave de
  `Category`. Os grupos definem `min` e `max`: `min: 1, max: 1` vira escolha
  única obrigatória; `min: 0` vira lista de adicionais.
- **`src/data/coupons.ts`** — cupons, com desconto percentual, fixo ou frete
  grátis, e subtotal mínimo.

Ao remover um produto ou uma opção do cardápio, sacolas salvas que os
referenciem simplesmente descartam aquele trecho — não é preciso migrar nada.

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
entrar por colagem no nome ou no endereço. É rede de proteção, não licença para
reintroduzir caracteres arriscados.

## Decisões de interface

O app é usado com uma mão, em movimento, muitas vezes com a tela suja de
gordura. Isso define as regras:

- **Rotas de verdade, não estado.** Sacola e checkout são endereços próprios, e
  o botão voltar do sistema fecha a tela certa em vez de sair do aplicativo.
- **Áreas seguras.** `viewport-fit=cover` no HTML e tokens `--safe-*` derivados
  de `env(safe-area-inset-*)`. Sem isso a barra fixa cai embaixo do indicador de
  gestos do iPhone e da barra de navegação do Android.
- **A barra inferior se mede.** Sua altura muda conforme aparece o aviso de
  pedido mínimo ou de grupo pendente, então ela publica a altura real em
  `--bar-h` e o conteúdo reserva esse espaço. Um valor fixo deixaria a última
  seção escondida sempre que o aviso surgisse.
- **Alvos de toque de 44px no mínimo** em todo controle (WCAG 2.5.5). O
  interruptor de talheres substituiu uma caixa de seleção nativa justamente
  porque ela tem 24px e não dá para ampliar sem distorcer.
- **Sem depender de `hover`.** Estados de pressão usam `.press` / `.press-sm`,
  que recuam o elemento sem deslocar o layout ao redor.
- **Botão travado explica o motivo.** Com grupo obrigatório pendente, o CTA fica
  inerte e a faixa acima diz o que falta — e leva até lá ao ser tocada.
- **`prefers-reduced-motion`** desliga animações em laço e transformações.
- **`h-dvh` em vez de `100vh`**, que no mobile conta a barra do navegador e
  empurra rodapés fixos para fora da tela.
- **Feedback tátil** só em confirmações reais, silencioso onde a API não existe.

## Modelo de confiança

Todo o pedido é calculado no navegador e a URL do WhatsApp é montada no próprio
cliente. Sem servidor, **nada do que o cliente guarda pode ser tratado como
confiável**.

Por isso a sacola persistida em `localStorage` grava apenas identificadores:
id do produto, ids das opções, quantidades, observação e o código do cupom.
Preço base, nome, acréscimos das opções e valor do desconto são sempre relidos
de `src/data/` na carga. Guardar qualquer preço permitiria editar o
armazenamento pelo DevTools e enviar à cozinha um pedido com valor forjado.

A leitura valida cada linha contra o catálogo:

- o produto precisa existir;
- o grupo precisa pertencer àquele produto;
- a opção precisa pertencer àquele grupo e não estar esgotada;
- a quantidade de cada opção e a soma do grupo precisam respeitar o `max`;
- a quantidade da linha precisa ser inteira entre 1 e 99;
- a observação é truncada;
- o cupom é revalidado por código, inclusive o subtotal mínimo;
- sacolas com mais de 12 horas são descartadas, porque os preços podem ter
  mudado.

JSON inválido, campos ausentes ou armazenamento bloqueado resultam em sacola
vazia, nunca em exceção.

**Endereço e geolocalização não são persistidos.** Os dados do checkout vivem só
em memória: recarregar a página perde o formulário, o que é preferível a deixar
o endereço de alguém gravado no navegador de um aparelho possivelmente
compartilhado.

**Cupons são conveniência, não defesa.** A validação é no cliente, então alguém
determinado consegue aplicar um cupom pelo DevTools. Como o pedido passa pelo
WhatsApp e a loja confirma na mão, um desconto indevido aparece na comanda antes
de virar prejuízo.

Se um dia entrar um backend, **o total precisa ser recalculado no servidor** a
partir dos ids recebidos. A validação do cliente é conveniência, não defesa.

## Licença

Projeto privado.
