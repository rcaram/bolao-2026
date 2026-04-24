import React from "react";
import { Link } from "wouter";
import { useCreateBolao, useGetBoloes, useJoinBolao } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBolaoContext } from "@/lib/bolao-context";

export default function Boloes() {
  const queryClient = useQueryClient();
  const { data: boloes } = useGetBoloes();
  const { selectedBolaoId, setSelectedBolaoId } = useBolaoContext();
  const createBolao = useCreateBolao({
    mutation: {
      onSuccess: async (created) => {
        await queryClient.invalidateQueries();
        setSelectedBolaoId(created.id);
      },
    },
  });
  const joinBolao = useJoinBolao({
    mutation: {
      onSuccess: async (joined) => {
        await queryClient.invalidateQueries();
        setSelectedBolaoId(joined.id);
      },
    },
  });

  const list = Array.isArray(boloes) ? boloes : [];

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <h1 className="text-4xl font-display font-bold">BOLOES</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Criar bolao</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  createBolao.mutate({
                    data: {
                      name: String(formData.get("name") ?? ""),
                      description: String(formData.get("description") ?? ""),
                    },
                  });
                }}
              >
                <Input name="name" placeholder="Nome do bolao" required />
                <Input name="description" placeholder="Descricao (opcional)" />
                <Button type="submit" disabled={createBolao.isPending} className="w-full">
                  {createBolao.isPending ? "Criando..." : "Criar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Entrar com codigo</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  joinBolao.mutate({ data: { inviteCode: String(formData.get("inviteCode") ?? "") } });
                }}
              >
                <Input name="inviteCode" placeholder="Codigo convite" required />
                <Button type="submit" disabled={joinBolao.isPending} className="w-full">
                  {joinBolao.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Meus boloes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {list.length === 0 ? (
              <p className="text-muted-foreground">Sem bolao ainda.</p>
            ) : (
              list.map((bolao) => (
                <div key={bolao.id} className="flex items-center justify-between rounded-lg border border-white/10 p-4">
                  <div>
                    <p className="font-display font-bold">{bolao.name}</p>
                    <p className="text-xs text-muted-foreground">Codigo: {bolao.inviteCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={selectedBolaoId === bolao.id ? "default" : "secondary"}
                      onClick={() => setSelectedBolaoId(bolao.id)}
                    >
                      {selectedBolaoId === bolao.id ? "Selecionado" : "Selecionar"}
                    </Button>
                    <Link href={`/boloes/${bolao.id}/settings`}>
                      <Button variant="outline">Config</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
