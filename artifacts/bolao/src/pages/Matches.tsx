import React, { useState } from "react";
import { getGetMatchesQueryKey, useGetMatches } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { MatchCard } from "@/components/MatchCard";
import { useBolaoContext } from "@/lib/bolao-context";

const STAGES = ["all", "group", "round_of_32", "round_of_16", "quarterfinal", "semifinal", "third_place", "final"];

export default function Matches() {
  const { selectedBolaoId } = useBolaoContext();
  const [stageFilter, setStageFilter] = useState<any>("all");
  const matchParams =
    stageFilter === "all"
      ? { bolaoId: selectedBolaoId ?? undefined }
      : { stage: stageFilter, bolaoId: selectedBolaoId ?? undefined };
  const { data: matches, isLoading } = useGetMatches(
    matchParams,
    { query: { queryKey: getGetMatchesQueryKey(matchParams), enabled: selectedBolaoId !== null } }
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-4">MATCHES</h1>
          
          <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
            {STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className={`whitespace-nowrap px-5 py-2 rounded-full font-display uppercase text-sm transition-all ${
                  stageFilter === stage 
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_var(--color-primary)]" 
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                {stage.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-64 rounded-2xl bg-secondary/50 animate-pulse" />)}
          </div>
        ) : Array.isArray(matches) && matches.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {matches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            No matches found for this filter.
          </div>
        )}
      </div>
    </Layout>
  );
}
