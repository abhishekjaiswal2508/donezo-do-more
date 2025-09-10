import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreateReminder from "./pages/CreateReminder";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Notifications from "./pages/Notifications";
import Groups from "./pages/Groups";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="/create" element={<CreateReminder />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
