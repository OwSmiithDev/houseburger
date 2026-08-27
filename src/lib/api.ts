import { PostgrestClient } from '@supabase/postgrest-js';

/**
 * Acesso do CLIENTE ao banco: ler o cardápio e criar pedido. Nada além disso.
 *
 * Usa o postgrest-js direto em vez do supabase-js completo por peso. O pacote
 * completo arrasta junto o realtime (protocolo Phoenix) e o módulo de
 * autenticação, que somavam 55 KB comprimidos no carregamento inicial — para
 * um aplicativo que o cliente abre no celular, na rua, sem usar nenhum dos dois.
 *
 * O supabase-js completo continua existindo em `lib/supabase.ts`, importado
 * apenas pelas telas de admin, que carregam sob demanda.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurado = Boolean(url && chave);

if (!supabaseConfigurado && import.meta.env.DEV) {
  console.error(
    'Supabase não configurado. Copie .env.example para .env e preencha ' +
      'VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
  );
}

/**
 * A chave publicável viaja em todo pedido e é visível no navegador — é assim
 * mesmo. Quem limita o que ela pode fazer é o RLS, definido na seção 6 de
 * supabase/instalar.sql.
 */
export const api = new PostgrestClient(`${url ?? ''}/rest/v1`, {
  headers: {
    apikey: chave ?? '',
    Authorization: `Bearer ${chave ?? ''}`,
  },
});
