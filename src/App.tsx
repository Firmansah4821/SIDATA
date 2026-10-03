import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import OpenFileRedirect from "./pages/OpenFileRedirect";
import PengaturanRouteGuard from "./components/sidata/PengaturanRouteGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/open-file" element={<OpenFileRedirect />} />
          {/* Pengaturan — khusus Admin (Petugas ditolak "Khusus Admin") */}
          <Route path="/pengaturan/log-aktivitas" element={<PengaturanRouteGuard />} />
          <Route path="/pengaturan/backup-restore" element={<PengaturanRouteGuard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
