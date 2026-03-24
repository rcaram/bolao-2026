import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Trophy, CalendarDays, BarChart3, User, ShieldAlert, LogOut } from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const logout = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        window.location.href = "/login";
      }
    }
  });

  const navItems = [
    { href: "/", label: "Dashboard", icon: Trophy },
    { href: "/matches", label: "Matches", icon: CalendarDays },
    { href: "/leaderboard", label: "Ranking", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: User },
  ];

  if (user?.role === "admin") {
    navItems.push({ href: "/admin", label: "Admin", icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-y-0 border-l-0 sticky top-0 h-screen z-40">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Trophy className="w-5 h-5 text-black" />
          </div>
          <span className="font-display text-2xl font-bold tracking-wider text-glow">BOLÃO 26</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-display uppercase tracking-wide transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "group-hover:text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="px-4 py-3 mb-2 rounded-xl bg-secondary/50">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-display uppercase tracking-wide text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-0 min-h-screen overflow-x-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
        
        {/* Mobile Header */}
        <header className="md:hidden glass-panel sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b border-t-0 border-x-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Trophy className="w-4 h-4 text-black" />
            </div>
            <span className="font-display text-xl font-bold tracking-wider">BOLÃO 26</span>
          </div>
          <button onClick={() => logout.mutate()} className="p-2 text-muted-foreground">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-x-0 border-b-0 flex items-center justify-around p-2 pb-safe z-50">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute -top-1 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)]" />
              )}
              <item.icon className={cn("w-6 h-6 mb-1", isActive && "drop-shadow-[0_0_8px_var(--color-primary)]")} />
              <span className="text-[10px] font-display uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
