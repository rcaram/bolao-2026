import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Matches from "./pages/Matches";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useGetMe();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !user) {
    // defer redirect to next tick
    setTimeout(() => setLocation("/login"), 0);
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/invite/:token" component={Login} />
      
      <Route path="/">
        <AuthGuard><Dashboard /></AuthGuard>
      </Route>
      <Route path="/matches">
        <AuthGuard><Matches /></AuthGuard>
      </Route>
      <Route path="/leaderboard">
        <AuthGuard><Leaderboard /></AuthGuard>
      </Route>
      <Route path="/profile">
        <AuthGuard><Profile /></AuthGuard>
      </Route>
      <Route path="/admin">
        <AuthGuard><Admin /></AuthGuard>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
