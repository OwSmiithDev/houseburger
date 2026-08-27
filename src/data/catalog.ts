import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, supabaseConfigurado } from '@/lib/api';
import type {
  Catalog,
  CategoryInfo,
  Coupon,
  OptionGroup,
  Product,
  StoreSettings,
} from '@/types/order';

export const CATALOG_KEY = ['catalog'] as const;

/*
 * Uma carga só para o cardápio inteiro.
 *
 * São sete tabelas, mas o catálogo de uma hamburgueria é pequeno (dezenas de
 * linhas) e o cliente precisa de tudo antes de deixar montar um pedido. Buscar
 * por partes só multiplicaria estados de carregamento na tela.
 */
const buscarCatalogo = async (): Promise<Catalog> => {
  if (!supabaseConfigurado) {
    throw new Error(
      'Supabase não configurado. Preencha .env a partir de .env.example.',
    );
  }

  const [cfg, cats, prods, grupos, opcoes, juncao, cupons] = await Promise.all([
    api.from('store_settings').select('*').eq('id', 1).single(),
    api.from('categories').select('*').order('ordem'),
    api.from('products').select('*').order('ordem'),
    api.from('option_groups').select('*').order('ordem'),
    api.from('option_items').select('*').order('ordem'),
    api.from('product_groups').select('*').order('ordem'),
    api.from('coupons').select('*'),
  ]);

  for (const r of [cfg, cats, prods, grupos, opcoes, juncao, cupons]) {
    if (r.error) throw new Error(r.error.message);
  }

  const settings: StoreSettings = {
    name: cfg.data.nome,
    whatsapp: cfg.data.whatsapp,
    pixKey: cfg.data.chave_pix,
    banner: cfg.data.banner_url,
    logo: cfg.data.logo_url,
    rating: Number(cfg.data.avaliacao),
    ratingsLabel: cfg.data.avaliacoes,
    timeMin: cfg.data.tempo_min,
    timeMax: cfg.data.tempo_max,
    serviceFeeRate: Number(cfg.data.taxa_servico),
    minOrder: Number(cfg.data.pedido_minimo),
    open: cfg.data.aberta,

    address: cfg.data.endereco ?? '',
    lat: cfg.data.lat === null ? null : Number(cfg.data.lat),
    lng: cfg.data.lng === null ? null : Number(cfg.data.lng),

    deliveryMode: cfg.data.entrega_modo ?? 'fixo',
    deliveryFee: Number(cfg.data.taxa_entrega),
    deliveryBase: Number(cfg.data.taxa_base ?? 0),
    deliveryPerKm: Number(cfg.data.taxa_por_km ?? 0),
    deliveryMaxKm:
      cfg.data.raio_maximo_km === null ? null : Number(cfg.data.raio_maximo_km),
  };

  const categories: CategoryInfo[] = (cats.data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    label: c.rotulo,
    icon: c.icone,
  }));

  // Monta os grupos com suas opções uma vez só, para reaproveitar a mesma
  // referência em todos os produtos que os usam.
  const opcoesPorGrupo = new Map<string, OptionGroup['options']>();
  for (const o of opcoes.data ?? []) {
    const lista = opcoesPorGrupo.get(o.group_id) ?? [];
    lista.push({
      id: o.slug,
      name: o.nome,
      priceDelta: Number(o.price_delta),
      soldOut: o.esgotado,
    });
    opcoesPorGrupo.set(o.group_id, lista);
  }

  const grupoPorId = new Map<string, OptionGroup>();
  for (const g of grupos.data ?? []) {
    grupoPorId.set(g.id, {
      id: g.slug,
      name: g.nome,
      min: g.min_opcoes,
      max: g.max_opcoes,
      options: opcoesPorGrupo.get(g.id) ?? [],
    });
  }

  const gruposPorProduto = new Map<string, OptionGroup[]>();
  for (const j of juncao.data ?? []) {
    const g = grupoPorId.get(j.group_id);
    if (!g) continue;
    const lista = gruposPorProduto.get(j.product_id) ?? [];
    lista.push(g);
    gruposPorProduto.set(j.product_id, lista);
  }

  const slugDaCategoria = new Map(categories.map((c) => [c.id, c.slug]));

  const products: Product[] = (prods.data ?? [])
    // Um produto de categoria desativada não tem onde aparecer.
    .filter((p) => slugDaCategoria.has(p.category_id))
    .map((p) => ({
      id: p.slug,
      name: p.nome,
      description: p.descricao,
      price: Number(p.preco),
      image: p.image_url,
      category: slugDaCategoria.get(p.category_id) as string,
      featured: p.destaque,
      soldOut: p.esgotado,
      groups: gruposPorProduto.get(p.id),
    }));

  const couponList: Coupon[] = (cupons.data ?? []).map((c) => ({
    code: c.codigo,
    description: c.descricao,
    type: c.tipo,
    value: Number(c.valor),
    minSubtotal: Number(c.min_subtotal),
  }));

  return { settings, categories, products, coupons: couponList };
};

/**
 * O catálogo é a fonte de verdade de preços e do estado da loja, então não pode
 * envelhecer em silêncio.
 *
 * `staleTime: 0` é deliberado. Com 60 segundos, `refetchOnWindowFocus` pulava a
 * busca sempre que a aba voltasse dentro desse intervalo — o que produzia um
 * defeito assimétrico: fechar a loja aparecia na hora (já havia passado um
 * minuto), mas reabrir não aparecia até recarregar a página inteira, porque o
 * dado ainda era considerado fresco.
 *
 * O catálogo tem dezenas de linhas em sete tabelas; buscar de novo é barato
 * perto de mostrar um cardápio errado.
 */
export const useCatalog = (): UseQueryResult<Catalog, Error> =>
  useQuery({
    queryKey: CATALOG_KEY,
    queryFn: buscarCatalogo,
    staleTime: 0,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30_000,
    // Aba escondida não precisa consultar: economiza bateria e requisição.
    refetchIntervalInBackground: false,
  });

export const findProduct = (catalog: Catalog, id: string): Product | undefined =>
  catalog.products.find((p) => p.id === id);

export const findCoupon = (catalog: Catalog, code: string): Coupon | undefined =>
  catalog.coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
