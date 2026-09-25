import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Playground from "./pages/Playground";
import Examples from "./pages/Examples";
import RenderResult from "./pages/RenderResult";
import RendersLibrary from "./pages/RendersLibrary";
import VoiceStudio from "./pages/VoiceStudio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Groups />} />
          <Route path="/groups/:slug" element={<GroupDetail />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/examples" element={<Examples />} />
          <Route path="/result" element={<RenderResult />} />
          <Route path="/renders" element={<RendersLibrary />} />
          <Route path="/voice-studio" element={<VoiceStudio />} />
          <Route path="/voice" element={<VoiceStudio />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
