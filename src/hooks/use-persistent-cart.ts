import { useCallback, useEffect, useState } from 'react';
import { findProduct } from '@/data/products';
import { findCoupon } from '@/data/coupons';
import { MAX_OBSERVACAO, MAX_QUANTIDADE_LINHA } from '@/data/config';
import type { CartLine } from '@/types/order';

const STORAGE_KEY = 'houseburger:cart:v2';
/** Carrinho parado por mais de 12h é descartado: cardápio e preços podem ter mudado. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * O que vai para o disco é só referência: id do produto, ids das opções,
 * quantidades e o código do cupom. Nome, descrição, preço base e acréscimos
 * são relidos do catálogo a cada carga.
 */
interface StoredCart {
  savedAt: number;
  lines: CartLine[];
  couponCode: string | null;
  cutlery: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const inteiroEntre = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/**
 * Reidrata uma linha, tratando o conteúdo salvo como entrada não confiável.
 *
 * localStorage é gravável pelo usuário (DevTools) e por qualquer script na
 * origem. Cada campo é conferido contra o catálogo: produto existe, grupo
 * pertence ao produto, opção pertence ao grupo, quantidade respeita o `max` do
 * grupo. Um acréscimo forjado não sobrevive porque o preço nunca vem daqui.
 */
const validarLinha = (entry: unknown): CartLine | null => {
  if (!isRecord(entry)) return null;

  const { lineId, productId, quantity, notes, selections } = entry;
  if (typeof lineId !== 'string' || lineId.length > 64) return null;
  if (typeof productId !== 'string') return null;
  if (!inteiroEntre(quantity, 1, MAX_QUANTIDADE_LINHA)) return null;

  const product = findProduct(productId);
  if (!product) return null;

  const limpas: CartLine['selections'] = {};

  if (isRecord(selections)) {
    for (const group of product.groups ?? []) {
      const marcadas = selections[group.id];
      if (!isRecord(marcadas)) continue;

      const doGrupo: Record<string, number> = {};
      let totalDoGrupo = 0;

      for (const option of group.options) {
        const q = marcadas[option.id];
        if (!inteiroEntre(q, 1, group.max)) continue;
        if (option.soldOut) continue;

        // O grupo inteiro não pode passar do próprio limite.
        if (totalDoGrupo + q > group.max) continue;

        doGrupo[option.id] = q;
        totalDoGrupo += q;
      }

      if (totalDoGrupo > 0) limpas[group.id] = doGrupo;
    }
  }

  return {
    lineId,
    productId,
    quantity,
    notes: typeof notes === 'string' ? notes.slice(0, MAX_OBSERVACAO) : '',
    selections: limpas,
  };
};

const readCart = (): { lines: CartLine[]; couponCode: string | null; cutlery: boolean } => {
  const vazio = { lines: [], couponCode: null, cutlery: false };

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return vazio; // modo privado / armazenamento bloqueado
  }
  if (!raw) return vazio;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return vazio;
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.lines)) return vazio;
  if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) {
    return vazio;
  }

  const lines: CartLine[] = [];
  const vistos = new Set<string>();
  for (const entry of parsed.lines) {
    const linha = validarLinha(entry);
    if (!linha || vistos.has(linha.lineId)) continue;
    vistos.add(linha.lineId);
    lines.push(linha);
  }

  // O cupom também é revalidado: um código inventado não atravessa.
  const code =
    typeof parsed.couponCode === 'string' && findCoupon(parsed.couponCode)
      ? parsed.couponCode.trim().toUpperCase()
      : null;

  return { lines, couponCode: code, cutlery: parsed.cutlery === true };
};

const writeCart = (lines: CartLine[], couponCode: string | null, cutlery: boolean) => {
  try {
    if (lines.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const payload: StoredCart = { savedAt: Date.now(), lines, couponCode, cutlery };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* cota estourada ou armazenamento bloqueado — segue em memória */
  }
};

/**
 * Carrinho que sobrevive a recarregar a página e a sair para o WhatsApp e
 * voltar — no celular isso é rotina.
 */
export const usePersistentCart = () => {
  // Inicializador preguiçoso: lê uma vez, antes da primeira pintura, evitando
  // o piscar de "carrinho vazio" que um useEffect causaria.
  const [estado, setEstado] = useState(readCart);

  useEffect(() => {
    writeCart(estado.lines, estado.couponCode, estado.cutlery);
  }, [estado]);

  const setLines = useCallback(
    (atualiza: (anterior: CartLine[]) => CartLine[]) =>
      setEstado((e) => ({ ...e, lines: atualiza(e.lines) })),
    [],
  );

  const addLine = useCallback(
    (line: CartLine) => setLines((anterior) => [...anterior, line]),
    [setLines],
  );

  const updateLine = useCallback(
    (lineId: string, patch: Partial<CartLine>) =>
      setLines((anterior) =>
        anterior.map((l) => (l.lineId === lineId ? { ...l, ...patch } : l)),
      ),
    [setLines],
  );

  const removeLine = useCallback(
    (lineId: string) =>
      setLines((anterior) => anterior.filter((l) => l.lineId !== lineId)),
    [setLines],
  );

  const setQuantity = useCallback(
    (lineId: string, quantity: number) =>
      setLines((anterior) =>
        quantity <= 0
          ? anterior.filter((l) => l.lineId !== lineId)
          : anterior.map((l) =>
              l.lineId === lineId
                ? { ...l, quantity: Math.min(quantity, MAX_QUANTIDADE_LINHA) }
                : l,
            ),
      ),
    [setLines],
  );

  const setCoupon = useCallback(
    (couponCode: string | null) => setEstado((e) => ({ ...e, couponCode })),
    [],
  );

  const setCutlery = useCallback(
    (cutlery: boolean) => setEstado((e) => ({ ...e, cutlery })),
    [],
  );

  const clearCart = useCallback(
    () => setEstado({ lines: [], couponCode: null, cutlery: false }),
    [],
  );

  return {
    lines: estado.lines,
    couponCode: estado.couponCode,
    cutlery: estado.cutlery,
    addLine,
    updateLine,
    removeLine,
    setQuantity,
    setCoupon,
    setCutlery,
    clearCart,
  };
};
