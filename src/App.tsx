import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Playground from "./pages/Playground";
import Examples from "./pages/Examples";

import RenderResult from "./pages/RenderResult";
import RendersLibrary from "./pages/RendersLibrary";
import Studio from "./pages/Studio";
import ImageLibrary from "./pages/ImageLibrary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/examples" element={<Examples />} />
          
          <Route path="/result" element={<RenderResult />} />
          <Route path="/renders" element={<RendersLibrary />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/images" element={<ImageLibrary />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
