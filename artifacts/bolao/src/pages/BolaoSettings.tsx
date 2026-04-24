import React from "react";
import {
  getGetBolaoMembersQueryKey,
  getGetBolaoQueryKey,
  getGetBolaoScoringConfigQueryKey,
  useGetBolao,
  useGetBolaoMembers,
  useGetBolaoScoringConfig,
  useRegenerateBolaoInviteCode,
  useRemoveBolaoMember,
  useUpdateBolaoMemberRole,
  useUpdateBolaoScoringConfig,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function useBolaoIdFromUrl(): number | null {
  const [location] = useLocation();
  const match = /^\/boloes\/(\d+)\/settings$/.exec(location);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? null : value;
}

export default function BolaoSettings() {
  const bolaoId = useBolaoIdFromUrl();
  const queryClient = useQueryClient();

  const { data: bolao } = useGetBolao(bolaoId ?? 0, {
    query: { queryKey: getGetBolaoQueryKey(bolaoId ?? 0), enabled: bolaoId !== null },
  });
  const { data: members } = useGetBolaoMembers(bolaoId ?? 0, {
    query: { queryKey: getGetBolaoMembersQueryKey(bolaoId ?? 0), enabled: bolaoId !== null },
  });
  const { data: scoring } = useGetBolaoScoringConfig(bolaoId ?? 0, {
    query: { queryKey: getGetBolaoScoringConfigQueryKey(bolaoId ?? 0), enabled: bolaoId !== null },
  });

  const regenerateCode = useRegenerateBolaoInviteCode({
    mutation: { onSuccess: async () => queryClient.invalidateQueries() },
  });
  const updateScoring = useUpdateBolaoScoringConfig({
    mutation: { onSuccess: async () => queryClient.invalidateQueries() },
  });
  const updateRole = useUpdateBolaoMemberRole({
    mutation: { onSuccess: async () => queryClient.invalidateQueries() },
  });
  const removeMember = useRemoveBolaoMember({
    mutation: { onSuccess: async () => queryClient.invalidateQueries() },
  });

  if (!bolaoId) {
    return (
      <Layout>
        <div className="text-center text-destructive py-20">Bolao invalido.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <h1 className="text-4xl font-display font-bold">CONFIGURACAO BOLAO</h1>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>{bolao?.name ?? "Bolao"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Codigo atual: {bolao?.inviteCode ?? "-"}</p>
            <Button onClick={() => regenerateCode.mutate({ bolaoId })} disabled={regenerateCode.isPending}>
              Gerar novo codigo
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Pontuacao</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                updateScoring.mutate({
                  bolaoId,
                  data: {
                    exactScore: Number(formData.get("exactScore")),
                    correctOutcomeGoalDiff: Number(formData.get("correctOutcomeGoalDiff")),
                    correctOutcome: Number(formData.get("correctOutcome")),
                    wrongOutcome: Number(formData.get("wrongOutcome")),
                    bonusChampion: Number(formData.get("bonusChampion")),
                    bonusTopScorer: Number(formData.get("bonusTopScorer")),
                  },
                });
              }}
            >
              <Input name="exactScore" type="number" min={0} defaultValue={scoring?.exactScore ?? 10} />
              <Input
                name="correctOutcomeGoalDiff"
                type="number"
                min={0}
                defaultValue={scoring?.correctOutcomeGoalDiff ?? 7}
              />
              <Input name="correctOutcome" type="number" min={0} defaultValue={scoring?.correctOutcome ?? 5} />
              <Input name="wrongOutcome" type="number" min={0} defaultValue={scoring?.wrongOutcome ?? 0} />
              <Input name="bonusChampion" type="number" min={0} defaultValue={scoring?.bonusChampion ?? 15} />
              <Input name="bonusTopScorer" type="number" min={0} defaultValue={scoring?.bonusTopScorer ?? 10} />
              <div className="col-span-2">
                <Button type="submit" className="w-full" disabled={updateScoring.isPending}>
                  Salvar pontuacao
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Membros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Array.isArray(members) ? members : []).map((member) => (
              <div key={member.userId} className="flex items-center justify-between gap-2 border border-white/10 rounded-lg p-3">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      updateRole.mutate({
                        bolaoId,
                        userId: member.userId,
                        data: { role: member.role === "admin" ? "member" : "admin" },
                      })
                    }
                  >
                    {member.role}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => removeMember.mutate({ bolaoId, userId: member.userId })}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
