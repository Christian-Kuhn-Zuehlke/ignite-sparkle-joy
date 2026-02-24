import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ConditionalOverlays } from "@/components/layout/ConditionalOverlays";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "@/components/icons";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Returns = lazy(() => import("./pages/Returns"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Kpis = lazy(() => import("./pages/Kpis"));
const AIHub = lazy(() => import("./pages/AIHub"));
const Inbound = lazy(() => import("./pages/Inbound"));
const CustomerCockpit = lazy(() => import("./pages/CustomerCockpit"));
const PaletteDemo = lazy(() => import("./pages/PaletteDemo"));
const Quality = lazy(() => import("./pages/Quality"));
const Packaging = lazy(() => import("./pages/Packaging"));
const ABCAnalysis = lazy(() => import("./pages/ABCAnalysis"));
const ClarificationCases = lazy(() => import("./pages/ClarificationCases"));
const Forecast = lazy(() => import("./pages/Forecast"));
const OrderAging = lazy(() => import("./pages/OrderAging"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="text-sm text-muted-foreground">Laden...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 Sekunden
      gcTime: 5 * 60 * 1000, // 5 Minuten (früher cacheTime)
      refetchOnWindowFocus: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// App component with conditional overlays
const App = () => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // Optional: Error Tracking Service hier einbinden
      console.error('App Error:', error, errorInfo);
    }}
  >
    <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BrandingProvider>
            <ConditionalOverlays />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <Orders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <ProtectedRoute>
                      <OrderDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <ProtectedRoute>
                      <Inventory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/returns"
                  element={
                    <ProtectedRoute>
                      <Returns />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kpis"
                  element={
                    <ProtectedRoute>
                      <Kpis />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai"
                  element={
                    <ProtectedRoute>
                      <AIHub />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inbound"
                  element={
                    <ProtectedRoute>
                      <Inbound />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customer-cockpit"
                  element={
                    <ProtectedRoute>
                      <CustomerCockpit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/palette-demo"
                  element={
                    <ProtectedRoute>
                      <PaletteDemo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/executive"
                  element={
                    <ProtectedRoute allowedRoles={['msd_management', 'system_admin']}>
                      <ExecutiveDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quality"
                  element={
                    <ProtectedRoute>
                      <Quality />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/packaging"
                  element={
                    <ProtectedRoute>
                      <Packaging />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/abc-analysis"
                  element={
                    <ProtectedRoute>
                      <ABCAnalysis />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clarification-cases"
                  element={
                    <ProtectedRoute>
                      <ClarificationCases />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/forecast"
                  element={
                    <ProtectedRoute>
                      <Forecast />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/order-aging"
                  element={
                    <ProtectedRoute>
                      <OrderAging />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrandingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
