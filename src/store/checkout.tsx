import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CustomerData } from '@/types/order';

/**
 * Dados do checkout enquanto o cliente navega entre /checkout, /pagamento e
 * /endereco.
 *
 * Fica só em memória, de propósito: endereço e coordenadas não vão para o
 * armazenamento local. Recarregar a página perde o formulário, o que é
 * preferível a deixar o endereço de alguém gravado no navegador de um aparelho
 * possivelmente compartilhado. A sacola, essa sim, sobrevive.
 */
interface CheckoutApi {
  customer: CustomerData;
  setCustomer: (patch: Partial<CustomerData>) => void;
  reset: () => void;
}

const inicial: CustomerData = {
  name: '',
  deliveryType: 'delivery',
  paymentMethod: 'pix',
  address: '',
  complement: '',
};

const CheckoutContext = createContext<CheckoutApi | null>(null);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomerState] = useState<CustomerData>(inicial);

  const value = useMemo<CheckoutApi>(
    () => ({
      customer,
      setCustomer: (patch) => setCustomerState((anterior) => ({ ...anterior, ...patch })),
      reset: () => setCustomerState(inicial),
    }),
    [customer],
  );

  return (
    <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
  );
};

export const useCheckout = (): CheckoutApi => {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout precisa estar dentro de <CheckoutProvider>');
  return ctx;
};
