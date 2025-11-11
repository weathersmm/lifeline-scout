import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isLandingEntry, isInternalEntry, isDemoEntry } from "@/config/entryMode";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import InternalAuth from "./pages/InternalAuth";
import Landing from "./pages/Landing";
import Demo from "./pages/Demo";
import Analytics from "./pages/Analytics";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // In landing mode, redirect to internal-auth for internal flows
    const redirectPath = isLandingEntry ? "/internal-auth" : "/auth";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

const App = () => {
  // Determine routing based on entry mode
  const getRoutes = () => {
    // Landing mode: Show landing page at root, then /auth for internal or /demo for external
    if (isLandingEntry) {
      return (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/internal-auth" element={<InternalAuth />} />
          <Route path="/demo" element={<Demo />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      );
    }

    // Internal mode: Root goes to dashboard, /auth is internal-only login
    if (isInternalEntry) {
      return (
        <Routes>
          <Route path="/auth" element={<InternalAuth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      );
    }

    // Demo mode: Root goes to demo, no internal access
    if (isDemoEntry) {
      return (
        <Routes>
          <Route path="/" element={<Demo />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      );
    }

    // Fallback (should not happen)
    return (
      <Routes>
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {getRoutes()}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;