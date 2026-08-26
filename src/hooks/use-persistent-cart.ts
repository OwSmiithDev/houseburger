import { useCallback, useEffect, useState } from 'react';
import { findCoupon, findProduct } from '@/data/catalog';
import type { CartLine, Catalog } from '@/types/order';

const STORAGE_KEY = 'houseburger:cart:v3';
/** Sacola parada por mais de 12h é descartada: cardápio e preços podem ter mudado. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_QUANTIDADE_LINHA = 99;
const MAX_OBSERVACAO = 140;

/**
 * O que vai para o disco é só referência: id do produto, ids das opções,
 * quantidades e o código do cupom. Nome, preço base, acréscimos e o valor do
 * desconto são sempre relidos do catálogo — que agora vem do banco.
 */
interface StoredCart {
  savedAt: number;
  lines: CartLine[];
  couponCode: string | null;
  cutlery: boolean;
}

interface EstadoCarrinho {
  lines: CartLine[];
  couponCode: string | null;
  cutlery: boolean;
}

const VAZIO: EstadoCarrinho = { lines: [], couponCode: null, cutlery: false };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const inteiroEntre = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/**
 * Reidrata uma linha tratando o conteúdo salvo como entrada não confiável.
 *
 * localStorage é gravável pelo usuário e por qualquer script na origem. Cada
 * campo é conferido contra o catálogo: produto existe e está disponível, grupo
 * pertence ao produto, opção pertence ao grupo, quantidades respeitam o `max`.
 * Um acréscimo forjado não sobrevive porque o preço nunca vem daqui.
 */
const validarLinha = (catalog: Catalog, entry: unknown): CartLine | null => {
  if (!isRecord(entry)) return null;

  const { lineId, productId, quantity, notes, selections } = entry;
  if (typeof lineId !== 'string' || lineId.length > 64) return null;
  if (typeof productId !== 'string') return null;
  if (!inteiroEntre(quantity, 1, MAX_QUANTIDADE_LINHA)) return null;

  const product = findProduct(catalog, productId);
  if (!product || product.soldOut) return null;

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

const readCart = (catalog: Catalog): EstadoCarrinho => {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return VAZIO; // modo privado / armazenamento bloqueado
  }
  if (!raw) return VAZIO;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return VAZIO;
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.lines)) return VAZIO;
  if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) {
    return VAZIO;
  }

  const lines: CartLine[] = [];
  const vistos = new Set<string>();
  for (const entry of parsed.lines) {
    const linha = validarLinha(catalog, entry);
    if (!linha || vistos.has(linha.lineId)) continue;
    vistos.add(linha.lineId);
    lines.push(linha);
  }

  // O cupom também é revalidado: um código inventado não atravessa.
  const code =
    typeof parsed.couponCode === 'string' && findCoupon(catalog, parsed.couponCode)
      ? parsed.couponCode.trim().toUpperCase()
      : null;

  return { lines, couponCode: code, cutlery: parsed.cutlery === true };
};

const writeCart = (estado: EstadoCarrinho) => {
  try {
    if (estado.lines.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const payload: StoredCart = { savedAt: Date.now(), ...estado };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* cota estourada ou armazenamento bloqueado — segue em memória */
  }
};

/**
 * Sacola que sobrevive a recarregar a página e a sair para o WhatsApp e voltar.
 *
 * Recebe o catálogo já carregado: sem ele não há como validar o que foi salvo,
 * e é por isso que o `CatalogGate` monta este hook só depois da carga.
 */
export const usePersistentCart = (catalog: Catalog) => {
  const [estado, setEstado] = useState<EstadoCarrinho>(() => readCart(catalog));

  useEffect(() => {
    writeCart(estado);
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

  const clearCart = useCallback(() => setEstado(VAZIO), []);

  return {
    lines: estado.lines,
    couponCode: estado.couponCode,
    cutlery: estado.cutlery,
    addLine,
    removeLine,
    setQuantity,
    setCoupon,
    setCutlery,
    clearCart,
  };
};
