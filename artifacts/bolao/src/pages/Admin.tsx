import React, { useState, useEffect } from "react";
import { 
  useGetMe, useListUsers, useCreateInvite, useCreateMatch, useUpdateMatchResult, useGetMatches, useGetTeams, useGetGroups,
  getListInvitesQueryKey, getGetMatchesQueryKey
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { formatStage } from "@/lib/utils";
import { getBaseUrl } from "@/lib/api";

function matchDisplayName(match: any): string {
  const home = match.homeTeam?.name ?? match.homePlaceholder ?? "TBD";
  const away = match.awayTeam?.name ?? match.awayPlaceholder ?? "TBD";
  return `${home} vs ${away}`;
}

export default function Admin() {
  const { data: user } = useGetMe();
  const [activeTab, setActiveTab] = useState("results");

  if (user?.role !== "admin") {
    return <Layout><div className="text-center py-20 text-destructive text-xl">Acesso Negado</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <h1 className="text-4xl font-display font-bold">PAINEL ADMIN</h1>

        <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
          {[
            { id: 'results',  label: 'Resultados' },
            { id: 'schedule', label: 'Calendário' },
            { id: 'scoring',  label: 'Pontuação' },
            { id: 'matches',  label: 'Criar Jogo' },
            { id: 'invites',  label: 'Convites' },
            { id: 'users',    label: 'Usuários' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-display uppercase tracking-wide transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'results'  && <UpdateResultTab />}
        {activeTab === 'schedule' && <ScheduleTab />}
        {activeTab === 'scoring'  && <ScoringConfigTab />}
        {activeTab === 'matches'  && <CreateMatchTab />}
        {activeTab === 'invites'  && <InvitesTab />}
        {activeTab === 'users'    && <UsersTab />}
      </div>
    </Layout>
  );
}

// ── Schedule Import ────────────────────────────────────────────────────────────

function ScheduleTab() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const queryClient = useQueryClient();

  async function handleImport() {
    if (!confirm("⚠️ Isso apagará TODOS os jogos, times e apostas existentes e importará o calendário oficial da FIFA 2026. Confirmar?")) return;
    setStatus("loading");
    try {
      const res = await fetch(`${getBaseUrl()}admin/import-schedule`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro desconhecido");
      setResult(data);
      setStatus("success");
      queryClient.invalidateQueries();
    } catch (err: any) {
      setResult({ error: err.message });
      setStatus("error");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Importar Calendário FIFA 2026</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Esta ação importa o calendário oficial da Copa do Mundo FIFA 2026 com os dados corretos confirmados pela Wikipedia:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>12 grupos</strong> (A–L) com os times confirmados</li>
              <li><strong>72 partidas</strong> da fase de grupos (11 Jun – 29 Jun 2026)</li>
              <li><strong>16 partidas</strong> das oitavas de final (28 Jun – 4 Jul 2026)</li>
              <li>6 vagas ainda em disputa (playoffs UEFA e intercontinentais)</li>
            </ul>
            <p className="text-destructive font-medium mt-2">⚠️ ATENÇÃO: Apagará todos os times, jogos e apostas existentes!</p>
          </div>

          <Button
            onClick={handleImport}
            disabled={status === "loading"}
            variant="destructive"
            className="w-full"
          >
            {status === "loading" ? "Importando..." : "🌍 Importar Calendário Real FIFA 2026"}
          </Button>

          {status === "success" && result && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <p className="text-green-400 font-bold mb-2">✅ {result.message}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Grupos:</span><span>{result.groups}</span>
                <span className="text-muted-foreground">Times:</span><span>{result.teams}</span>
                <span className="text-muted-foreground">Jogos (fase de grupos):</span><span>{result.groupMatches}</span>
                <span className="text-muted-foreground">Jogos (oitavas):</span><span>{result.r32Matches}</span>
              </div>
            </div>
          )}
          {status === "error" && result && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
              <p className="text-destructive font-bold">❌ Erro: {result.error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Scoring Config ─────────────────────────────────────────────────────────────

function ScoringConfigTab() {
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${getBaseUrl()}admin/scoring-config`, { credentials: "include" })
      .then(r => r.json())
      .then(setConfig);
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: any = {};
    for (const key of ["exactScore", "correctOutcomeGoalDiff", "correctOutcome", "wrongOutcome", "bonusChampion", "bonusTopScorer"]) {
      body[key] = parseInt(fd.get(key) as string);
    }
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch(`${getBaseUrl()}admin/scoring-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Erro ao salvar");
      setConfig(await res.json());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!config) return <div className="text-muted-foreground">Carregando...</div>;

  const fields = [
    { key: "exactScore",              label: "Placar Exato",                     desc: "Acertou o placar exato" },
    { key: "correctOutcomeGoalDiff",  label: "Resultado + Saldo de Gols",         desc: "Acertou o vencedor e saldo de gols, mas não o placar" },
    { key: "correctOutcome",          label: "Resultado Correto",                 desc: "Acertou apenas o vencedor/empate" },
    { key: "wrongOutcome",            label: "Resultado Errado",                  desc: "Errou o resultado" },
    { key: "bonusChampion",           label: "Bônus: Campeão",                   desc: "Acertou o campeão da Copa" },
    { key: "bonusTopScorer",          label: "Bônus: Artilheiro",                desc: "Acertou o artilheiro da Copa" },
  ];

  return (
    <Card className="glass-panel">
      <CardHeader><CardTitle>Configuração de Pontuação</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {fields.map(f => (
            <div key={f.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
              <Input
                name={f.key}
                type="number"
                min={0}
                defaultValue={config[f.key]}
                className="w-24 text-center"
                required
              />
            </div>
          ))}
          {error && <p className="text-destructive text-sm">{error}</p>}
          {saved && <p className="text-green-400 text-sm">✅ Salvo com sucesso!</p>}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Create Match ───────────────────────────────────────────────────────────────

function CreateMatchTab() {
  const queryClient = useQueryClient();
  const { data: teams } = useGetTeams({});
  const { data: groups } = useGetGroups();
  const [matchType, setMatchType] = useState<"team" | "placeholder">("team");

  const createMatch = useCreateMatch({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() }) }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const stage = fd.get('stage') as any;
    const matchDate = new Date(fd.get('matchDate') as string).toISOString();
    const venue = fd.get('venue') as string;
    const matchNumber = fd.get('matchNumber') ? parseInt(fd.get('matchNumber') as string) : undefined;
    const groupIdStr = fd.get('groupId') as string;
    const groupId = groupIdStr ? parseInt(groupIdStr) : undefined;

    if (matchType === "team") {
      createMatch.mutate({
        data: {
          homeTeamId: parseInt(fd.get('homeTeamId') as string),
          awayTeamId: parseInt(fd.get('awayTeamId') as string),
          groupId,
          matchDate,
          stage,
          venue,
          matchNumber,
        }
      });
    } else {
      createMatch.mutate({
        data: {
          homePlaceholder: fd.get('homePlaceholder') as string,
          awayPlaceholder: fd.get('awayPlaceholder') as string,
          matchDate,
          stage,
          venue,
          matchNumber,
        }
      });
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader><CardTitle>Criar Jogo</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMatchType("team")}
            className={`px-4 py-1.5 rounded-lg text-sm font-display uppercase ${matchType === "team" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            Selecionar Times
          </button>
          <button
            type="button"
            onClick={() => setMatchType("placeholder")}
            className={`px-4 py-1.5 rounded-lg text-sm font-display uppercase ${matchType === "placeholder" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            Placeholder (Eliminatórias)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          {matchType === "team" ? (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Time Mandante</label>
                <select name="homeTeamId" className="flex h-12 w-full rounded-lg border-2 border-input bg-background/50 px-4 py-2" required>
                  <option value="">Selecione...</option>
                  {teams?.map(t => (
                    <option key={t.id} value={t.id}>{t.flag} {t.name} {t.group ? `(Grupo ${t.group.name})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Time Visitante</label>
                <select name="awayTeamId" className="flex h-12 w-full rounded-lg border-2 border-input bg-background/50 px-4 py-2" required>
                  <option value="">Selecione...</option>
                  {teams?.map(t => (
                    <option key={t.id} value={t.id}>{t.flag} {t.name} {t.group ? `(Grupo ${t.group.name})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Grupo (opcional)</label>
                <select name="groupId" className="flex h-12 w-full rounded-lg border-2 border-input bg-background/50 px-4 py-2">
                  <option value="">Sem grupo</option>
                  {groups?.map(g => (
                    <option key={g.id} value={g.id}>Grupo {g.name}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Mandante</label>
                <Input name="homePlaceholder" placeholder="Ex: 1º Grupo A" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Visitante</label>
                <Input name="awayPlaceholder" placeholder="Ex: 2º Grupo B" required />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Data e Hora</label>
            <Input name="matchDate" type="datetime-local" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Fase</label>
            <select name="stage" className="flex h-12 w-full rounded-lg border-2 border-input bg-background/50 px-4 py-2" required>
              <option value="group">Fase de Grupos</option>
              <option value="round_of_32">Oitavas de Final</option>
              <option value="round_of_16">Quartas de Final (R16)</option>
              <option value="quarterfinal">Quartas de Final</option>
              <option value="semifinal">Semifinal</option>
              <option value="third_place">3º Lugar</option>
              <option value="final">Final</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Estádio</label>
            <Input name="venue" placeholder="Estádio, Cidade" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Nº do Jogo</label>
            <Input name="matchNumber" type="number" placeholder="Ex: 49" min={1} />
          </div>
          <div className="col-span-2">
            <Button type="submit" disabled={createMatch.isPending} className="w-full">
              {createMatch.isPending ? "Criando..." : "Criar Jogo"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Update Results ─────────────────────────────────────────────────────────────

function UpdateResultTab() {
  const { data: matches } = useGetMatches({});
  const queryClient = useQueryClient();
  const updateResult = useUpdateMatchResult({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() }) }
  });

  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const displayed = Array.isArray(matches) ? matches.filter(m => filter === "all" || m.status !== 'finished') : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setFilter("upcoming")}
          className={`px-3 py-1.5 rounded-lg text-sm font-display uppercase ${filter === "upcoming" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          Apenas Pendentes
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-display uppercase ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          Todos
        </button>
        <span className="text-muted-foreground text-sm ml-auto">{displayed.length} jogos</span>
      </div>

      {displayed.map(match => (
        <Card key={match.id} className="p-4 glass-panel">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-display">{matchDisplayName(match)}</p>
              <p className="text-xs text-muted-foreground">
                #{match.matchNumber} · {formatStage(match.stage)} · {new Date(match.matchDate).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' })}
              </p>
              {match.venue && <p className="text-xs text-muted-foreground">{match.venue}</p>}
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
              <Input name="home" type="number" defaultValue={match.homeScore ?? 0} className="w-16 h-10 text-center" min={0} required />
              <span className="font-display">×</span>
              <Input name="away" type="number" defaultValue={match.awayScore ?? 0} className="w-16 h-10 text-center" min={0} required />
              <select name="status" defaultValue={match.status} className="h-10 rounded-lg border-2 border-input bg-background/50 px-2 text-sm">
                <option value="upcoming">A Jogar</option>
                <option value="live">Ao Vivo</option>
                <option value="finished">Encerrado</option>
              </select>
              <Button type="submit" size="sm">Salvar</Button>
            </form>
          </div>
        </Card>
      ))}
      {displayed.length === 0 && <p className="text-muted-foreground">Nenhum jogo para exibir.</p>}
    </div>
  );
}

// ── Invites ────────────────────────────────────────────────────────────────────

function InvitesTab() {
  const createInvite = useCreateInvite({
    mutation: { onSuccess: () => {} }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createInvite.mutate({
      data: { email: fd.get('email') as string }
    });
  };

  return (
    <Card className="glass-panel">
      <CardHeader><CardTitle>Gerar Convite</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Input name="email" type="email" placeholder="E-mail do convidado" required className="flex-1" />
          <Button type="submit" disabled={createInvite.isPending}>Gerar Link</Button>
        </form>
        {createInvite.data?.inviteUrl && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-xl break-all">
            <p className="text-sm font-bold text-primary mb-1">Link de Convite:</p>
            <code className="text-xs">{createInvite.data.inviteUrl}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────────

function UsersTab() {
  const { data: users, isLoading } = useListUsers();

  return (
    <Card className="glass-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-muted-foreground text-sm uppercase">
              <th className="p-4">Nome</th>
              <th className="p-4">E-mail</th>
              <th className="p-4">Papel</th>
              <th className="p-4 text-right">Pts</th>
              <th className="p-4 text-right">Apostas</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="p-4 text-center">Carregando...</td></tr> :
              users?.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-bold">{u.name}</td>
                  <td className="p-4 text-muted-foreground">{u.email}</td>
                  <td className="p-4"><span className="bg-secondary px-2 py-1 rounded text-xs">{u.role}</span></td>
                  <td className="p-4 text-right font-display text-accent">{u.totalPoints}</td>
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
