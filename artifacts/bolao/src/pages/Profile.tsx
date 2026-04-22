import React, { useState } from "react";
import { useGetMyRanking, useGetMyBonusBets, useSubmitBonusBets, getGetMyBonusBetsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Profile() {
  const { data: ranking } = useGetMyRanking();
  const { data: bonusBets } = useGetMyBonusBets();
  
  const queryClient = useQueryClient();
  const submitBonus = useSubmitBonusBets({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyBonusBetsQueryKey() });
      }
    }
  });

  const [champion, setChampion] = useState(bonusBets?.champion || "");
  const [topScorer, setTopScorer] = useState(bonusBets?.topScorer || "");

  React.useEffect(() => {
    if (bonusBets) {
      setChampion(bonusBets.champion);
      setTopScorer(bonusBets.topScorer || "");
    }
  }, [bonusBets]);

  const handleBonusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitBonus.mutate({ data: { champion, topScorer } });
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-display font-bold">MY PROFILE</h1>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Bonus Predictions</CardTitle>
            <p className="text-muted-foreground text-sm">Lock in your tournament champion and top scorer before the deadline.</p>
          </CardHeader>
          <CardContent>
            {bonusBets?.locked ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-xl">
                  <div>
                    <p className="text-sm text-muted-foreground">Champion (+15 pts)</p>
                    <p className="text-xl font-display font-bold">{bonusBets.champion}</p>
                  </div>
                  {bonusBets.championPoints !== undefined && (
                    <div className="font-bold text-primary">+{bonusBets.championPoints}</div>
                  )}
                </div>
                <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-xl">
                  <div>
                    <p className="text-sm text-muted-foreground">Top Scorer (+10 pts)</p>
                    <p className="text-xl font-display font-bold">{bonusBets.topScorer || "-"}</p>
                  </div>
                  {bonusBets.topScorerPoints !== undefined && (
                    <div className="font-bold text-primary">+{bonusBets.topScorerPoints}</div>
                  )}
                </div>
                <p className="text-center text-accent text-sm flex items-center justify-center gap-2 mt-4">
                  <CheckCircle2 className="w-4 h-4" /> Predictions Locked
                </p>
              </div>
            ) : (
              <form onSubmit={handleBonusSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-muted-foreground">Tournament Champion</label>
                  <Input 
                    value={champion} 
                    onChange={e => setChampion(e.target.value)} 
                    placeholder="e.g. Brazil" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-muted-foreground">Golden Boot (Top Scorer)</label>
                  <Input 
                    value={topScorer} 
                    onChange={e => setTopScorer(e.target.value)} 
                    placeholder="e.g. Mbappe" 
                  />
                </div>
                <Button type="submit" disabled={submitBonus.isPending} className="w-full">
                  Save Bonus Bets
                </Button>
                {submitBonus.isSuccess && <p className="text-primary text-sm text-center">Saved successfully!</p>}
                {submitBonus.error && <p className="text-destructive text-sm text-center">{(submitBonus.error as any)?.message || "Error saving"}</p>}
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Recent Bet History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ranking?.recentBets?.length ? (
                ranking.recentBets.map(bet => (
                  <div key={bet.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-white/5">
                    <div>
                      <p className="font-display">
                        {bet.match?.homeTeam?.name ?? bet.match?.homePlaceholder ?? "TBD"} vs {bet.match?.awayTeam?.name ?? bet.match?.awayPlaceholder ?? "TBD"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Predicted: {bet.homeScore}-{bet.awayScore}
                      </p>
                    </div>
                    {bet.points !== undefined ? (
                      <div className="text-right">
                        <span className={`text-lg font-bold ${bet.points > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          +{bet.points}
                        </span>
                      </div>
                    ) : (
                      <span className="text-accent text-sm">Pending</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No settled bets yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
