import React from "react";
import {
  useGetMatches,
  useGetMyRanking,
  useGetMe,
  getGetMyRankingQueryKey,
  useGetBolaoScoringConfig,
  getGetBolaoScoringConfigQueryKey,
  getGetMatchesQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { MatchCard } from "@/components/MatchCard";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Star, ChevronRight, Info } from "lucide-react";
import { Link } from "wouter";
import { useBolaoContext } from "@/lib/bolao-context";

export default function Dashboard() {
  const { selectedBolaoId } = useBolaoContext();
  const { data: user } = useGetMe();
  const { data: ranking } = useGetMyRanking(selectedBolaoId ?? 0, {
    query: { queryKey: getGetMyRankingQueryKey(selectedBolaoId ?? 0), refetchInterval: 30000, enabled: selectedBolaoId !== null },
  });
  const { data: scoringConfig } = useGetBolaoScoringConfig(selectedBolaoId ?? 0, {
    query: { queryKey: getGetBolaoScoringConfigQueryKey(selectedBolaoId ?? 0), enabled: selectedBolaoId !== null },
  });
  const { data: matches, isLoading } = useGetMatches(
    { status: "upcoming", bolaoId: selectedBolaoId ?? undefined },
    { query: { queryKey: getGetMatchesQueryKey({ status: "upcoming", bolaoId: selectedBolaoId ?? undefined }), enabled: selectedBolaoId !== null } }
  );

  const upcomingMatches = Array.isArray(matches) ? matches.slice(0, 4) : [];

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

        {/* Scoring Rules */}
        <ScoringTable
          exactScore={scoringConfig?.exactScore ?? 10}
          correctOutcomeGoalDiff={scoringConfig?.correctOutcomeGoalDiff ?? 7}
          correctOutcome={scoringConfig?.correctOutcome ?? 5}
          wrongOutcome={scoringConfig?.wrongOutcome ?? 0}
          bonusChampion={scoringConfig?.bonusChampion ?? 15}
          bonusTopScorer={scoringConfig?.bonusTopScorer ?? 10}
        />
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

type ScoringTableProps = {
  exactScore: number;
  correctOutcomeGoalDiff: number;
  correctOutcome: number;
  wrongOutcome: number;
  bonusChampion: number;
  bonusTopScorer: number;
};

function ScoringTable({
  exactScore,
  correctOutcomeGoalDiff,
  correctOutcome,
  wrongOutcome,
  bonusChampion,
  bonusTopScorer,
}: ScoringTableProps) {
  const matchRows = [
    { result: "Placar Exato", description: "Acertou o placar exato do jogo", points: exactScore, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    { result: "Resultado + Saldo de Gols", description: "Acertou o vencedor e a diferença de gols", points: correctOutcomeGoalDiff, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
    { result: "Resultado Correto", description: "Acertou apenas o vencedor ou empate", points: correctOutcome, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
    { result: "Resultado Errado", description: "Não acertou o resultado", points: wrongOutcome, color: "text-muted-foreground", bg: "bg-secondary/40 border-white/5" },
  ];

  const bonusRows = [
    { result: "Campeão", description: "Acertou o campeão do torneio", points: bonusChampion, color: "text-accent", bg: "bg-accent/10 border-accent/20" },
    { result: "Artilheiro", description: "Acertou o artilheiro do torneio", points: bonusTopScorer, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
  ];

  const tiebreakerRows = [
    { order: "1º", criterion: "Mais placares exatos" },
    { order: "2º", criterion: "Mais resultados corretos" },
    { order: "3º", criterion: "Mais palpites enviados" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Info className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-display font-bold">PONTUAÇÃO</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Match scoring */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="bg-secondary/60 px-5 py-3 border-b border-white/10">
            <h3 className="font-display uppercase text-sm tracking-wider text-muted-foreground">Palpites de Partidas</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase text-muted-foreground">
                <th className="px-5 py-3 text-left">Resultado</th>
                <th className="px-5 py-3 text-left hidden sm:table-cell">Descrição</th>
                <th className="px-5 py-3 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {matchRows.map((row) => (
                <tr key={row.result} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-2 font-display font-semibold text-sm ${row.color}`}>
                      {row.result}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell">{row.description}</td>
                  <td className="px-5 py-4 text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-display font-bold border ${row.bg} ${row.color}`}>
                      {row.points > 0 ? `+${row.points}` : row.points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bonus + Tiebreaker */}
        <div className="flex flex-col gap-4">
          {/* Bonus */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden flex-1">
            <div className="bg-secondary/60 px-5 py-3 border-b border-white/10">
              <h3 className="font-display uppercase text-sm tracking-wider text-muted-foreground">Bônus</h3>
            </div>
            <table className="w-full">
              <tbody>
                {bonusRows.map((row) => (
                  <tr key={row.result} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4">
                      <p className={`font-display font-semibold text-sm ${row.color}`}>{row.result}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-display font-bold border ${row.bg} ${row.color}`}>
                        +{row.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tiebreaker */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="bg-secondary/60 px-5 py-3 border-b border-white/10">
              <h3 className="font-display uppercase text-sm tracking-wider text-muted-foreground">Desempate</h3>
            </div>
            <ul className="divide-y divide-white/5">
              {tiebreakerRows.map((row) => (
                <li key={row.order} className="flex items-center gap-4 px-5 py-3 hover:bg-white/3 transition-colors">
                  <span className="font-display font-bold text-primary text-lg w-8 shrink-0">{row.order}</span>
                  <span className="text-sm text-muted-foreground">{row.criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
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
