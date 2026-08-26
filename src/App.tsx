import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/store/cart";
import { CheckoutProvider } from "@/store/checkout";

/*
 * Rotas carregadas sob demanda. A tela da loja é o que a maioria vê, e não faz
 * sentido baixar o mapa (Leaflet, ~45 KB) junto com ela — só quem chega em
 * /endereco paga esse custo.
 */
const Store = lazy(() => import("./pages/Store"));
const Product = lazy(() => import("./pages/Product"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Payment = lazy(() => import("./pages/Payment"));
const Address = lazy(() => import("./pages/Address"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

/** Placeholder neutro: sem spinner piscando em transição rápida. */
const Carregando = () => (
  <div className="min-h-dvh bg-background" aria-busy="true" aria-live="polite">
    <span className="sr-only">Carregando</span>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <CartProvider>
        <CheckoutProvider>
          <BrowserRouter>
            <Suspense fallback={<Carregando />}>
              <Routes>
                <Route path="/" element={<Store />} />
                <Route path="/produto/:id" element={<Product />} />
                <Route path="/sacola" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/pagamento" element={<Payment />} />
                <Route path="/endereco" element={<Address />} />
                {/* Rotas novas entram acima do catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </CheckoutProvider>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
