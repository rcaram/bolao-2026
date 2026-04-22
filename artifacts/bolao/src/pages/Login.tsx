import React, { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useLogin, useRegister, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [match, params] = useRoute("/invite/:token");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: isAuthLoading } = useGetMe();

  const [isLogin, setIsLogin] = useState(!match);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteToken, setInviteToken] = useState(params?.token || "");

  const login = useLogin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    }
  });

  const register = useRegister({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    }
  });

  // Redirect if logged in
  React.useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  if (isAuthLoading) return null; // Let it flash or add spinner
  if (user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      login.mutate({ data: { email, password } });
    } else {
      register.mutate({ data: { email, password, name, inviteToken } });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image requested in requirements */}
      <img 
        src={`${import.meta.env.BASE_URL}images/hero-stadium.png`} 
        alt="Stadium" 
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 mb-6 rotate-12 hover:rotate-0 transition-transform duration-500">
            <Trophy className="w-10 h-10 text-black -rotate-12" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-widest text-glow mb-2">BOLÃO 2026</h1>
          <p className="text-muted-foreground text-lg">The ultimate World Cup prediction pool</p>
        </div>

        <Card className="glass-panel">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {(!isLogin) && (
                <>
                  <Input 
                    placeholder="Full Name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                  <Input 
                    placeholder="Invite Token" 
                    value={inviteToken} 
                    onChange={e => setInviteToken(e.target.value)} 
                    required 
                  />
                </>
              )}
              <Input 
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
              <Input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                minLength={6}
              />

              {(login.error || register.error) && (
                <div className="p-3 bg-destructive/20 border border-destructive/50 text-destructive text-sm rounded-lg text-center">
                  {((login.error || register.error) as any)?.error || "Authentication failed"}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full mt-4" disabled={login.isPending || register.isPending}>
                {isLogin ? "Enter the Arena" : "Join the Pool"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? "Need an invite? Sign up here" : "Already have an account? Login"}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
