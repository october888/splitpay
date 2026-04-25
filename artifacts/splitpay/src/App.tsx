import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Web3Provider } from "@/lib/web3";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";
import { setBaseUrl } from "@workspace/api-client-react";
import Home from "@/pages/Home";
import CreateSplit from "@/pages/CreateSplit";
import SplitDetail from "@/pages/SplitDetail";
import MySplits from "@/pages/MySplits";
import ParticipantPay from "@/pages/ParticipantPay";

const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateSplit} />
      <Route path="/split/:id" component={SplitDetail} />
      <Route path="/pay/:token" component={ParticipantPay} />
      <Route path="/me" component={MySplits} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // force dark mode
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Layout>
              <Router />
            </Layout>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </Web3Provider>
    </QueryClientProvider>
  );
}

export default App;
