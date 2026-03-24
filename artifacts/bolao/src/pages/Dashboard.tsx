import React from "react";
import { useGetMatches, useGetMyRanking, useGetMe } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { MatchCard } from "@/components/MatchCard";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Star, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: user } = useGetMe();
  const { data: ranking } = useGetMyRanking({ query: { refetchInterval: 30000 } });
  const { data: matches, isLoading } = useGetMatches({ status: "upcoming" });

  const upcomingMatches = matches?.slice(0, 4) || [];

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* Welcome Hero */}
        <div className="relative rounded-3xl overflow-hidden glass-panel border border-primary/20 p-8 md:p-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">
              WELCOME BACK, <span className="text-primary">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              The competition is fierce. Make your predictions before the matches lock.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Current Rank" 
            value={ranking?.rank ? `#${ranking.rank}` : "-"} 
            icon={Trophy} 
            color="text-accent" 
          />
          <StatCard 
            title="Total Points" 
            value={ranking?.totalPoints?.toString() || "0"} 
            icon={Star} 
            color="text-primary" 
          />
          <StatCard 
            title="Exact Scores" 
            value={ranking?.exactScores?.toString() || "0"} 
            icon={Target} 
            color="text-blue-400" 
          />
          <StatCard 
            title="Correct Outcomes" 
            value={ranking?.correctOutcomes?.toString() || "0"} 
            icon={CheckCircle2Icon} 
            color="text-purple-400" 
          />
        </div>

        {/* Upcoming Matches */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold">NEXT MATCHES</h2>
            <Link href="/matches" className="flex items-center gap-1 text-primary hover:text-primary/80 font-display uppercase text-sm">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map(i => <div key={i} className="h-64 rounded-2xl bg-secondary/50 animate-pulse" />)}
            </div>
          ) : upcomingMatches.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-dashed border-2">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-display mb-2">No upcoming matches</h3>
              <p className="text-muted-foreground">The tournament has concluded or no matches are scheduled.</p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="p-5 flex flex-col justify-between hover:scale-105 transition-transform cursor-default">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-display uppercase text-muted-foreground">{title}</span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <span className={`text-4xl font-display font-bold ${color}`}>{value}</span>
    </Card>
  );
}

function CheckCircle2Icon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
