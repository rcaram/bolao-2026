import React, { useState } from "react";
import { type MatchWithBet, useSubmitBet, getGetMatchesQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { formatStage, getTimeUntil, isBettingLocked, formatDate } from "@/lib/utils";
import { Clock, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useBolaoContext } from "@/lib/bolao-context";

function getTeamName(match: MatchWithBet, side: "home" | "away"): string {
  if (side === "home") {
    return match.homeTeam?.name ?? match.homePlaceholder ?? "TBD";
  }
  return match.awayTeam?.name ?? match.awayPlaceholder ?? "TBD";
}

function getTeamFlag(match: MatchWithBet, side: "home" | "away"): string {
  if (side === "home") return match.homeTeam?.flag ?? "🏳️";
  return match.awayTeam?.flag ?? "🏳️";
}

export function MatchCard({ match }: { match: MatchWithBet }) {
  const { selectedBolaoId } = useBolaoContext();
  const locked = isBettingLocked(match.bettingDeadline) || match.status !== "upcoming";
  const [homeScore, setHomeScore] = useState(match.userBet?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.userBet?.awayScore ?? 0);
  const [isEditing, setIsEditing] = useState(!match.userBet && !locked);

  const queryClient = useQueryClient();
  const submitBet = useSubmitBet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        setIsEditing(false);
      }
    }
  });

  const handleSave = () => {
    if (selectedBolaoId === null) return;
    submitBet.mutate({ bolaoId: selectedBolaoId, data: { matchId: match.id, homeScore, awayScore } });
  };

  const hasScoreResult = match.homeScore !== undefined && match.awayScore !== undefined;
  const groupLabel = match.group ? `Group ${match.group.name}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="flex flex-col group hover:border-primary/30 transition-colors">
        <div className="bg-secondary/50 px-4 py-2 flex items-center justify-between border-b border-white/5 text-xs font-display uppercase tracking-wider">
          <span className="text-muted-foreground">
            {groupLabel ? `${groupLabel} • ` : ""}{formatStage(match.stage)}
          </span>
          {locked ? (
            <span className={match.status === "finished" ? "text-muted-foreground" : "text-accent animate-pulse"}>
              {match.status === "finished" ? "Finished" : "Live"}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-primary">
              <Clock className="w-3 h-3" /> {getTimeUntil(match.bettingDeadline)}
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="text-center text-sm text-muted-foreground mb-4">
            {formatDate(match.matchDate)} • {match.venue || "TBD"}
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <span className="text-4xl drop-shadow-lg">
                {match.homeTeam ? getTeamFlag(match, "home") : "🏳️"}
              </span>
              <span className="font-display font-bold text-center leading-tight truncate w-full text-center">
                {getTeamName(match, "home")}
              </span>
            </div>

            {/* Score Center */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              {locked ? (
                <div className="flex items-center gap-3 bg-background/80 rounded-xl px-4 py-2 border border-white/5">
                  <span className="text-3xl font-display font-bold">{match.homeScore ?? "-"}</span>
                  <span className="text-muted-foreground font-display">X</span>
                  <span className="text-3xl font-display font-bold">{match.awayScore ?? "-"}</span>
                </div>
              ) : isEditing ? (
                <div className="flex items-center gap-2">
                  <ScoreInput value={homeScore} onChange={setHomeScore} />
                  <span className="text-muted-foreground font-display mt-2">X</span>
                  <ScoreInput value={awayScore} onChange={setAwayScore} />
                </div>
              ) : (
                <div className="flex flex-col items-center cursor-pointer" onClick={() => setIsEditing(true)}>
                  <div className="flex items-center gap-3 bg-primary/10 text-primary rounded-xl px-4 py-2 border border-primary/20">
                    <span className="text-3xl font-display font-bold">{homeScore}</span>
                    <span className="text-primary/50 font-display">X</span>
                    <span className="text-3xl font-display font-bold">{awayScore}</span>
                  </div>
                  <span className="text-xs text-primary mt-2 font-medium">Tap to edit</span>
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <span className="text-4xl drop-shadow-lg">
                {match.awayTeam ? getTeamFlag(match, "away") : "🏳️"}
              </span>
              <span className="font-display font-bold text-center leading-tight truncate w-full text-center">
                {getTeamName(match, "away")}
              </span>
            </div>
          </div>

          {/* Action Area */}
          <div className="mt-6">
            {!locked && isEditing && (
              <Button 
                className="w-full" 
                onClick={handleSave}
                disabled={submitBet.isPending}
              >
                {submitBet.isPending ? "Saving..." : "Save Prediction"}
              </Button>
            )}
            
            {locked && match.userBet && (
              <div className="bg-secondary/40 rounded-xl p-3 flex items-center justify-between border border-white/5">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Your Prediction</span>
                  <span className="font-display text-lg">
                    {match.userBet.homeScore} - {match.userBet.awayScore}
                  </span>
                </div>
                
                {hasScoreResult && (
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl text-accent">+{match.userBet.points} PTS</span>
                    {match.userBet.exactScore && <CheckCircle2 className="text-primary w-5 h-5" />}
                  </div>
                )}
              </div>
            )}

            {locked && !match.userBet && (
              <div className="text-center text-sm text-destructive bg-destructive/10 py-2 rounded-lg border border-destructive/20">
                Missed deadline
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ScoreInput({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button 
        onClick={() => onChange(value + 1)}
        className="w-10 h-8 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-t-lg flex items-center justify-center transition-colors"
      >
        <ChevronUp className="w-5 h-5" />
      </button>
      <div className="w-10 h-12 bg-background border border-white/10 flex items-center justify-center text-2xl font-display font-bold">
        {value}
      </div>
      <button 
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-10 h-8 bg-secondary hover:bg-destructive hover:text-destructive-foreground rounded-b-lg flex items-center justify-center transition-colors"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}
