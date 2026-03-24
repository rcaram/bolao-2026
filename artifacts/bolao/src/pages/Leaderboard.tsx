import React from "react";
import { useGetRankings, useGetMe } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function Leaderboard() {
  const { data: rankings, isLoading } = useGetRankings({ query: { refetchInterval: 30000 } });
  const { data: currentUser } = useGetMe();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_20px_var(--color-accent)]">
            <Trophy className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold">LEADERBOARD</h1>
            <p className="text-muted-foreground">Live standings updated every 30 seconds</p>
          </div>
        </div>

        <Card className="overflow-hidden border-none shadow-2xl glass-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/80 text-muted-foreground font-display uppercase text-xs tracking-wider">
                  <th className="p-4 pl-6 w-16">Rank</th>
                  <th className="p-4">Player</th>
                  <th className="p-4 text-center">PTS</th>
                  <th className="p-4 text-center hidden sm:table-cell" title="Exact Scores">
                    <Target className="w-4 h-4 mx-auto" />
                  </th>
                  <th className="p-4 text-center hidden md:table-cell" title="Correct Outcomes">
                    <Award className="w-4 h-4 mx-auto" />
                  </th>
                  <th className="p-4 text-center hidden lg:table-cell">Bonus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4 pl-6"><div className="w-6 h-6 bg-secondary rounded" /></td>
                      <td className="p-4"><div className="w-32 h-5 bg-secondary rounded" /></td>
                      <td className="p-4"><div className="w-10 h-6 bg-secondary rounded mx-auto" /></td>
                      <td className="p-4 hidden sm:table-cell"><div className="w-6 h-6 bg-secondary rounded mx-auto" /></td>
                      <td className="p-4 hidden md:table-cell"><div className="w-6 h-6 bg-secondary rounded mx-auto" /></td>
                      <td className="p-4 hidden lg:table-cell"><div className="w-6 h-6 bg-secondary rounded mx-auto" /></td>
                    </tr>
                  ))
                ) : (
                  rankings?.map((entry, idx) => {
                    const isMe = entry.userId === currentUser?.id;
                    const isTop3 = entry.rank <= 3;
                    
                    return (
                      <motion.tr 
                        key={entry.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`transition-colors hover:bg-white/5 ${isMe ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                      >
                        <td className="p-4 pl-6">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm
                            ${entry.rank === 1 ? 'bg-accent text-black shadow-[0_0_10px_var(--color-accent)]' : 
                              entry.rank === 2 ? 'bg-slate-300 text-black' : 
                              entry.rank === 3 ? 'bg-amber-700 text-white' : 'bg-secondary text-muted-foreground'}`}>
                            {entry.rank}
                          </div>
                        </td>
                        <td className="p-4 font-semibold">
                          <span className={isMe ? 'text-primary' : ''}>{entry.userName}</span>
                          {isMe && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase font-display">You</span>}
                        </td>
                        <td className="p-4 text-center font-display font-bold text-xl text-primary">
                          {entry.totalPoints}
                        </td>
                        <td className="p-4 text-center hidden sm:table-cell text-muted-foreground">
                          {entry.exactScores}
                        </td>
                        <td className="p-4 text-center hidden md:table-cell text-muted-foreground">
                          {entry.correctOutcomes}
                        </td>
                        <td className="p-4 text-center hidden lg:table-cell text-muted-foreground">
                          {entry.bonusPoints}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
