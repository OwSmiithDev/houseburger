import { createClient } from '@supabase/supabase-js';

/**
 * Cliente completo do Supabase — autenticação e Storage.
 *
 * IMPORTA SÓ NAS TELAS DE ADMIN. Este módulo arrasta o realtime e o módulo de
 * autenticação (55 KB comprimidos); como as rotas de admin carregam sob
 * demanda, esse peso nunca chega ao cliente que só quer pedir um lanche.
 * Para ler o cardápio e criar pedido, use `lib/api.ts`.
 *
 * A chave publicável vai embutida no JavaScript — esperado e seguro, porque o
 * RLS de `supabase/instalar.sql` restringe o visitante a ler o catálogo.
 * Nenhuma chave de servidor (`service_role`, `sb_secret_`) pode entrar aqui:
 * qualquer variável com prefixo VITE_ é pública.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(url ?? '', chave ?? '', {
  auth: {
    // A sessão do dono sobrevive a recarregar a página do admin.
    persistSession: true,
    autoRefreshToken: true,
    // O cliente não usa links mágicos; ler a URL atrás de tokens só atrapalha.
    detectSessionInUrl: false,
  },
});
