import { supabase } from '@/lib/supabase';

/**
 * Escrita do admin.
 *
 * Nenhuma destas funções carrega permissão própria: quem autoriza é o RLS,
 * definido em supabase/instalar.sql. Sem sessão válida o banco recusa, mesmo
 * que alguém force a rota no navegador ou chame isto pelo console.
 */

const naoDeuCerto = (erro: { message: string } | null) => {
  if (erro) throw new Error(erro.message);
};

/**
 * Deixa passar só as colunas reais da tabela.
 *
 * As listagens trazem relações aninhadas (`products` vem com `categories`,
 * `option_groups` vem com `option_items`) e mandar isso de volta num update faz
 * o PostgREST recusar: "Could not find the 'categories' column".
 */
const apenas = <T extends object>(obj: T, colunas: readonly string[]) =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => colunas.includes(k)),
  ) as Partial<T>;

const COLUNAS_PRODUTO = [
  'slug', 'nome', 'descricao', 'preco', 'image_url',
  'category_id', 'destaque', 'esgotado', 'ordem', 'ativo',
] as const;

const COLUNAS_GRUPO = ['slug', 'nome', 'min_opcoes', 'max_opcoes', 'ordem'] as const;
const COLUNAS_OPCAO = ['group_id', 'slug', 'nome', 'price_delta', 'esgotado', 'ordem'] as const;
const COLUNAS_CUPOM = [
  'codigo', 'descricao', 'tipo', 'valor', 'min_subtotal', 'ativo', 'expira_em',
] as const;
const COLUNAS_CATEGORIA = ['slug', 'rotulo', 'icone', 'ordem', 'ativa'] as const;

// ------------------------------------------------------------------ produtos
export interface ProdutoAdmin {
  id?: string;
  slug: string;
  nome: string;
  descricao: string;
  preco: number;
  image_url: string;
  category_id: string;
  destaque: boolean;
  esgotado: boolean;
  ordem: number;
  ativo: boolean;
}

export const listarProdutos = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(slug, rotulo)')
    .order('ordem');
  naoDeuCerto(error);
  return data ?? [];
};

export const salvarProduto = async (p: ProdutoAdmin) => {
  const campos = apenas(p, COLUNAS_PRODUTO);
  const { error } = p.id
    ? await supabase.from('products').update(campos).eq('id', p.id)
    : await supabase.from('products').insert(campos);
  naoDeuCerto(error);
};

export const removerProduto = async (id: string) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  naoDeuCerto(error);
};

/** Alterna esgotado/destaque/ativo sem abrir o formulário inteiro. */
export const alternarProduto = async (
  id: string,
  campo: 'esgotado' | 'destaque' | 'ativo',
  valor: boolean,
) => {
  const { error } = await supabase.from('products').update({ [campo]: valor }).eq('id', id);
  naoDeuCerto(error);
};

// ------------------------------------------------------------------- grupos
export const listarGrupos = async () => {
  const { data, error } = await supabase
    .from('option_groups')
    .select('*, option_items(*)')
    .order('ordem');
  naoDeuCerto(error);
  return (data ?? []).map((g) => ({
    ...g,
    option_items: [...(g.option_items ?? [])].sort((a, b) => a.ordem - b.ordem),
  }));
};

export const salvarGrupo = async (g: {
  id?: string;
  slug: string;
  nome: string;
  min_opcoes: number;
  max_opcoes: number;
  ordem: number;
}) => {
  const campos = apenas(g, COLUNAS_GRUPO);
  const { error } = g.id
    ? await supabase.from('option_groups').update(campos).eq('id', g.id)
    : await supabase.from('option_groups').insert(campos);
  naoDeuCerto(error);
};

export const removerGrupo = async (id: string) => {
  const { error } = await supabase.from('option_groups').delete().eq('id', id);
  naoDeuCerto(error);
};

export const salvarOpcao = async (o: {
  id?: string;
  group_id: string;
  slug: string;
  nome: string;
  price_delta: number;
  esgotado: boolean;
  ordem: number;
}) => {
  const campos = apenas(o, COLUNAS_OPCAO);
  const { error } = o.id
    ? await supabase.from('option_items').update(campos).eq('id', o.id)
    : await supabase.from('option_items').insert(campos);
  naoDeuCerto(error);
};

export const removerOpcao = async (id: string) => {
  const { error } = await supabase.from('option_items').delete().eq('id', id);
  naoDeuCerto(error);
};

/** Quais grupos um produto usa. A ordem define a ordem na tela do cliente. */
export const definirGruposDoProduto = async (productId: string, groupIds: string[]) => {
  const { error: apagar } = await supabase
    .from('product_groups')
    .delete()
    .eq('product_id', productId);
  naoDeuCerto(apagar);

  if (groupIds.length === 0) return;
  const { error } = await supabase.from('product_groups').insert(
    groupIds.map((group_id, ordem) => ({ product_id: productId, group_id, ordem })),
  );
  naoDeuCerto(error);
};

export const gruposDoProduto = async (productId: string) => {
  const { data, error } = await supabase
    .from('product_groups')
    .select('group_id, ordem')
    .eq('product_id', productId)
    .order('ordem');
  naoDeuCerto(error);
  return (data ?? []).map((r) => r.group_id as string);
};

// --------------------------------------------------------------- categorias
export const listarCategorias = async () => {
  const { data, error } = await supabase.from('categories').select('*').order('ordem');
  naoDeuCerto(error);
  return data ?? [];
};

export const salvarCategoria = async (c: {
  id?: string;
  slug: string;
  rotulo: string;
  icone: string;
  ordem: number;
  ativa: boolean;
}) => {
  const campos = apenas(c, COLUNAS_CATEGORIA);
  const { error } = c.id
    ? await supabase.from('categories').update(campos).eq('id', c.id)
    : await supabase.from('categories').insert(campos);
  naoDeuCerto(error);
};

/**
 * Quantos produtos usam cada categoria.
 *
 * Serve para a tela recusar a exclusão de uma categoria que ainda tem itens.
 * A chave estrangeira é `on delete set null`, então o banco deixaria excluir e
 * os produtos ficariam órfãos — sumiriam da navegação sem ninguém perceber.
 */
export const contarProdutosPorCategoria = async () => {
  const { data, error } = await supabase.from('products').select('category_id');
  naoDeuCerto(error);
  const contagem = new Map<string, number>();
  for (const { category_id } of data ?? []) {
    if (category_id) contagem.set(category_id, (contagem.get(category_id) ?? 0) + 1);
  }
  return contagem;
};

export const removerCategoria = async (id: string) => {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  naoDeuCerto(error);
};

// ------------------------------------------------------------------- cupons
export const listarCupons = async () => {
  const { data, error } = await supabase.from('coupons').select('*').order('codigo');
  naoDeuCerto(error);
  return data ?? [];
};

export const salvarCupom = async (c: {
  id?: string;
  codigo: string;
  descricao: string;
  tipo: string;
  valor: number;
  min_subtotal: number;
  ativo: boolean;
  /** ISO 8601, ou nulo para cupom sem validade. */
  expira_em?: string | null;
}) => {
  const campos = apenas(c, COLUNAS_CUPOM);
  const { error } = c.id
    ? await supabase.from('coupons').update(campos).eq('id', c.id)
    : await supabase.from('coupons').insert(campos);
  naoDeuCerto(error);
};

export const removerCupom = async (id: string) => {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  naoDeuCerto(error);
};

// ---------------------------------------------------------------- da loja
export const lerConfiguracao = async () => {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .single();
  naoDeuCerto(error);
  return data;
};

export const salvarConfiguracao = async (campos: Record<string, unknown>) => {
  const { id, ...resto } = campos;
  void id; // a linha é sempre a de id 1
  const { error } = await supabase
    .from('store_settings')
    .update({ ...resto, atualizado_em: new Date().toISOString() })
    .eq('id', 1);
  naoDeuCerto(error);
};

// ------------------------------------------------------------------ pedidos
export type StatusPedido =
  | 'pendente'
  | 'preparando'
  | 'saiu'
  | 'entregue'
  | 'cancelado';

export const listarPedidos = async (limite = 100) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('criado_em', { ascending: false })
    .limit(limite);
  naoDeuCerto(error);
  return data ?? [];
};

/**
 * Busca no histórico inteiro, e não só nos pedidos já carregados.
 *
 * `listarPedidos` traz os mais recentes; procurar dentro deles deixaria um
 * pedido de mês passado invisível, sem nenhum sinal de que existe. Quem filtra
 * é o banco, pela função `buscar_pedidos`.
 */
export const buscarPedidos = async (f: {
  texto?: string;
  inicio?: string | null;
  fim?: string | null;
  status?: StatusPedido | null;
  limite?: number;
}) => {
  const { data, error } = await supabase.rpc('buscar_pedidos', {
    p_texto: f.texto?.trim() || null,
    p_inicio: f.inicio || null,
    p_fim: f.fim || null,
    p_status: f.status || null,
    p_limite: f.limite ?? 100,
  });
  naoDeuCerto(error);
  return (data ?? []) as Awaited<ReturnType<typeof listarPedidos>>;
};

export const mudarStatus = async (id: string, status: StatusPedido) => {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  naoDeuCerto(error);
};

// ------------------------------------------------------------------- fotos
const MAX_IMAGEM = 5 * 1024 * 1024;

/**
 * Sobe uma imagem para o bucket `midia` e devolve a URL pública.
 *
 * O limite e os tipos são conferidos aqui por conveniência; o bucket também
 * precisa estar configurado no painel, porque validação de navegador nunca é
 * garantia.
 */
export const enviarImagem = async (arquivo: File): Promise<string> => {
  if (!arquivo.type.startsWith('image/')) {
    throw new Error('O arquivo precisa ser uma imagem.');
  }
  if (arquivo.size > MAX_IMAGEM) {
    throw new Error('Imagem muito grande. O limite é 5 MB.');
  }

  const extensao = arquivo.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const caminho = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;

  const { error } = await supabase.storage
    .from('midia')
    .upload(caminho, arquivo, { cacheControl: '31536000', upsert: false });
  naoDeuCerto(error);

  const { data } = supabase.storage.from('midia').getPublicUrl(caminho);
  return data.publicUrl;
};
