import React, { useState } from "react";
import { 
  useGetMe, useListUsers, useCreateInvite, useCreateMatch, useUpdateMatchResult, useGetMatches,
  getListInvitesQueryKey, getGetMatchesQueryKey
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { formatStage } from "@/lib/utils";

export default function Admin() {
  const { data: user } = useGetMe();
  const [activeTab, setActiveTab] = useState("matches");

  if (user?.role !== "admin") {
    return <Layout><div className="text-center py-20 text-destructive text-xl">Access Denied</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <h1 className="text-4xl font-display font-bold">ADMIN PANEL</h1>

        <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
          {['matches', 'results', 'invites', 'users'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-display uppercase tracking-wide transition-colors ${
                activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'matches' && <CreateMatchTab />}
        {activeTab === 'results' && <UpdateResultTab />}
        {activeTab === 'invites' && <InvitesTab />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </Layout>
  );
}

function CreateMatchTab() {
  const queryClient = useQueryClient();
  const createMatch = useCreateMatch({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() }) }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMatch.mutate({
      data: {
        homeTeam: fd.get('homeTeam') as string,
        awayTeam: fd.get('awayTeam') as string,
        homeTeamFlag: fd.get('homeTeamFlag') as string,
        awayTeamFlag: fd.get('awayTeamFlag') as string,
        matchDate: new Date(fd.get('matchDate') as string).toISOString(),
        stage: fd.get('stage') as any,
        venue: fd.get('venue') as string,
      }
    });
  };

  return (
    <Card className="glass-panel">
      <CardHeader><CardTitle>Create Match</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1 space-y-2">
            <Input name="homeTeam" placeholder="Home Team Name" required />
            <Input name="homeTeamFlag" placeholder="Home Flag Emoji (🇧🇷)" />
          </div>
          <div className="col-span-2 md:col-span-1 space-y-2">
            <Input name="awayTeam" placeholder="Away Team Name" required />
            <Input name="awayTeamFlag" placeholder="Away Flag Emoji (🇦🇷)" />
          </div>
          <div className="col-span-2 md:col-span-1 space-y-2">
            <label className="text-xs text-muted-foreground">Match Date & Time</label>
            <Input name="matchDate" type="datetime-local" required />
          </div>
          <div className="col-span-2 md:col-span-1 space-y-2">
            <label className="text-xs text-muted-foreground">Stage</label>
            <select name="stage" className="flex h-12 w-full rounded-lg border-2 border-input bg-background/50 px-4 py-2" required>
              <option value="group">Group Stage</option>
              <option value="round_of_16">Round of 16</option>
              <option value="quarterfinal">Quarterfinal</option>
              <option value="semifinal">Semifinal</option>
              <option value="final">Final</option>
            </select>
          </div>
          <div className="col-span-2 space-y-2">
            <Input name="venue" placeholder="Venue / Stadium" />
          </div>
          <div className="col-span-2">
            <Button type="submit" disabled={createMatch.isPending} className="w-full">
              {createMatch.isPending ? "Creating..." : "Create Match"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UpdateResultTab() {
  const { data: matches } = useGetMatches();
  const queryClient = useQueryClient();
  const updateResult = useUpdateMatchResult({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() }) }
  });

  const activeMatches = matches?.filter(m => m.status !== 'finished') || [];

  return (
    <div className="space-y-4">
      {activeMatches.map(match => (
        <Card key={match.id} className="p-4 flex items-center justify-between glass-panel">
          <div>
            <p className="font-display">{match.homeTeam} vs {match.awayTeam}</p>
            <p className="text-xs text-muted-foreground">{formatStage(match.stage)}</p>
          </div>
          <form 
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateResult.mutate({
                matchId: match.id,
                data: {
                  homeScore: parseInt(fd.get('home') as string),
                  awayScore: parseInt(fd.get('away') as string),
                  status: fd.get('status') as any
                }
              });
            }}
          >
            <Input name="home" type="number" defaultValue={match.homeScore || 0} className="w-16 h-10 text-center" min={0} required />
            <span className="font-display">X</span>
            <Input name="away" type="number" defaultValue={match.awayScore || 0} className="w-16 h-10 text-center" min={0} required />
            <select name="status" defaultValue="finished" className="h-10 rounded-lg border-2 border-input bg-background/50 px-2 text-sm">
              <option value="live">Live</option>
              <option value="finished">Finished</option>
            </select>
            <Button type="submit" size="sm">Save</Button>
          </form>
        </Card>
      ))}
      {activeMatches.length === 0 && <p className="text-muted-foreground">No active or upcoming matches to update.</p>}
    </div>
  );
}

function InvitesTab() {
  const queryClient = useQueryClient();
  const createInvite = useCreateInvite({
    mutation: { onSuccess: () => alert("Invite created successfully!") } // Should invalidate listInvites if we added the GET endpoint
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createInvite.mutate({
      data: {
        email: fd.get('email') as string
      }
    });
  };

  return (
    <Card className="glass-panel">
      <CardHeader><CardTitle>Generate Invite</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Input name="email" type="email" placeholder="User's Email" required className="flex-1" />
          <Button type="submit" disabled={createInvite.isPending}>Generate Link</Button>
        </form>
        {createInvite.data?.inviteUrl && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-xl break-all">
            <p className="text-sm font-bold text-primary mb-1">Invite URL:</p>
            <code className="text-xs">{window.location.origin}/invite/{createInvite.data.invite.token}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  const { data: users, isLoading } = useListUsers();

  return (
    <Card className="glass-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-muted-foreground text-sm uppercase">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4 text-right">Bets</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr> : 
              users?.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-bold">{u.name}</td>
                  <td className="p-4 text-muted-foreground">{u.email}</td>
                  <td className="p-4"><span className="bg-secondary px-2 py-1 rounded text-xs">{u.role}</span></td>
                  <td className="p-4 text-right">{u.betsSubmitted}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </Card>
  );
}
