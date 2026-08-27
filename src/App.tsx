import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CatalogGate } from "@/components/CatalogGate";
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
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const NotFound = lazy(() => import("./pages/NotFound"));

/*
 * Admin em pedaços próprios. Estas telas trazem o supabase-js completo
 * (autenticação e Storage, ~55 KB comprimidos), que nunca deve chegar ao
 * cliente que só quer pedir um lanche.
 */
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminGroups = lazy(() => import("./pages/admin/Groups"));
const AdminCoupons = lazy(() => import("./pages/admin/Coupons"));
const AdminStore = lazy(() => import("./pages/admin/StoreSettings"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));

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
      <CheckoutProvider>
          <BrowserRouter>
            <Suspense fallback={<Carregando />}>
              <Routes>
                {/* Administração fora do CatalogGate: o dono precisa entrar
                    mesmo com a loja fechada ou o cardápio com problema. */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/pedidos" element={<AdminOrders />} />
                <Route path="/admin/produtos" element={<AdminProducts />} />
                <Route path="/admin/grupos" element={<AdminGroups />} />
                <Route path="/admin/cupons" element={<AdminCoupons />} />
                <Route path="/admin/loja" element={<AdminStore />} />
                <Route path="/admin/relatorios" element={<AdminReports />} />

                {/* Cliente: nada renderiza sem catálogo carregado. */}
                <Route
                  path="/*"
                  element={
                    <CatalogGate>
                      <Routes>
                        <Route path="/" element={<Store />} />
                        <Route path="/produto/:id" element={<Product />} />
                        <Route path="/sacola" element={<Cart />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/pagamento" element={<Payment />} />
                        <Route path="/endereco" element={<Address />} />
                        <Route path="/pedido/:token" element={<TrackOrder />} />
                        <Route path="/meus-pedidos" element={<MyOrders />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </CatalogGate>
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
      </CheckoutProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
