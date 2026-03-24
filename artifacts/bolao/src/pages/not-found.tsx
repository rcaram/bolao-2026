import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <Layout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
        <Trophy className="w-24 h-24 text-muted mb-6 opacity-20" />
        <h1 className="text-6xl font-display font-black text-destructive mb-4">404</h1>
        <h2 className="text-2xl font-display text-muted-foreground mb-8">Out of Bounds</h2>
        <p className="mb-8 max-w-md text-muted-foreground">
          The page you are looking for has been disqualified or doesn't exist on this pitch.
        </p>
        <Link href="/">
          <Button size="lg">Return to Pitch</Button>
        </Link>
      </div>
    </Layout>
  );
}
