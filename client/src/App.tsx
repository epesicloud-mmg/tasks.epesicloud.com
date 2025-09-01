import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import Chat from "@/pages/chat";
import Vault from "@/pages/vault";
import Financials from "@/pages/financials";

import NotFound from "@/pages/not-found";
import AcceptInvitation from "@/pages/accept-invitation";
import SimpleAccept from "@/pages/simple-accept";

function Router() {
  // Check if current path is invitation - handle without auth
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  if (currentPath.startsWith('/accept-invitation')) {
    return <SimpleAccept />;
  }
  
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        ) : !isAuthenticated ? (
          <Landing />
        ) : (
          <Dashboard />
        )}
      </Route>
      <Route path="/workspace/:workspaceId/members">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        ) : !isAuthenticated ? (
          <Landing />
        ) : (
          <Members />
        )}
      </Route>
      <Route path="/workspace/:workspaceId/chat">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        ) : !isAuthenticated ? (
          <Landing />
        ) : (
          <Chat />
        )}
      </Route>
      <Route path="/workspace/:workspaceId/vault">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        ) : !isAuthenticated ? (
          <Landing />
        ) : (
          <Vault />
        )}
      </Route>
      <Route path="/workspace/:workspaceId/financials">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        ) : !isAuthenticated ? (
          <Landing />
        ) : (
          <Financials />
        )}
      </Route>

      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
