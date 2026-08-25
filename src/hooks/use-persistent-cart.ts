import { useCallback, useEffect, useState } from 'react';
import { products } from '@/data/products';
import { CartItem } from '@/types/order';

const STORAGE_KEY = 'houseburger:cart:v1';
/** Carrinho parado por mais de 12h é descartado: o cardápio e os preços podem ter mudado. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_QUANTITY = 99;
const MAX_NOTES_LENGTH = 200;

/**
 * O que vai para o disco é só a referência do item — nunca o produto inteiro.
 * Nome, descrição e principalmente PREÇO são relidos do catálogo a cada carga.
 */
interface StoredItem {
  id: string;
  quantity: number;
  notes: string;
}

interface StoredCart {
  savedAt: number;
  items: StoredItem[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Reidrata o carrinho a partir do armazenamento local.
 *
 * localStorage é gravável pelo próprio usuário (DevTools) e por qualquer script
 * que rode na origem. Tudo que sai dali é entrada não confiável: cada item é
 * revalidado contra o catálogo e o preço é sempre o do catálogo, jamais o
 * que estava salvo.
 */
const readCart = (): CartItem[] => {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return []; // modo privado / armazenamento bloqueado
  }

  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.items)) return [];
  if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) {
    return [];
  }

  const restored: CartItem[] = [];
  const seen = new Set<string>();

  for (const entry of parsed.items) {
    if (!isRecord(entry)) continue;

    const { id, quantity, notes } = entry;
    if (typeof id !== 'string' || seen.has(id)) continue;

    // O id precisa existir no cardápio atual — item removido do menu não volta
    const product = products.find((candidate) => candidate.id === id);
    if (!product) continue;

    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) continue;
    if (quantity < 1 || quantity > MAX_QUANTITY) continue;

    seen.add(id);
    restored.push({
      product, // do catálogo: preço confiável
      quantity,
      notes: typeof notes === 'string' ? notes.slice(0, MAX_NOTES_LENGTH) : '',
    });
  }

  return restored;
};

const writeCart = (items: CartItem[]) => {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const payload: StoredCart = {
      savedAt: Date.now(),
      items: items.map((item) => ({
        id: item.product.id,
        quantity: item.quantity,
        notes: item.notes.slice(0, MAX_NOTES_LENGTH),
      })),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* cota estourada ou armazenamento bloqueado — o app segue em memória */
  }
};

/**
 * Carrinho que sobrevive a recarregar a página, trocar de aba e recuperar a
 * sessão — no celular, sair para o WhatsApp e voltar é rotina.
 */
export const usePersistentCart = () => {
  // Inicializador preguiçoso: lê uma vez, antes da primeira pintura, evitando
  // o piscar de "carrinho vazio" que um useEffect causaria.
  const [cartItems, setCartItems] = useState<CartItem[]>(readCart);

  useEffect(() => {
    writeCart(cartItems);
  }, [cartItems]);

  const clearCart = useCallback(() => setCartItems([]), []);

  return { cartItems, setCartItems, clearCart };
};
