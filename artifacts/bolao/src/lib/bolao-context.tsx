import React from "react";
import { useGetBoloes } from "@workspace/api-client-react";

type BolaoContextValue = {
  selectedBolaoId: number | null;
  setSelectedBolaoId: (value: number | null) => void;
  isLoading: boolean;
  boloes: Array<{ id: number; name: string; inviteCode: string }>;
};

const BolaoContext = React.createContext<BolaoContextValue | null>(null);
const STORAGE_KEY = "selected_bolao_id";

export function BolaoProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useGetBoloes();
  const boloes = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [selectedBolaoId, setSelectedBolaoIdState] = React.useState<number | null>(null);

  React.useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed)) setSelectedBolaoIdState(parsed);
  }, []);

  React.useEffect(() => {
    if (isLoading) return;
    if (boloes.length === 0) {
      setSelectedBolaoIdState(null);
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const exists = selectedBolaoId !== null && boloes.some((bolao) => bolao.id === selectedBolaoId);
    if (exists) return;

    const firstId = boloes[0].id;
    setSelectedBolaoIdState(firstId);
    window.localStorage.setItem(STORAGE_KEY, String(firstId));
  }, [boloes, isLoading, selectedBolaoId]);

  const setSelectedBolaoId = React.useCallback((value: number | null) => {
    setSelectedBolaoIdState(value);
    if (value === null) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  const value = React.useMemo<BolaoContextValue>(
    () => ({ selectedBolaoId, setSelectedBolaoId, isLoading, boloes }),
    [boloes, isLoading, selectedBolaoId, setSelectedBolaoId]
  );

  return <BolaoContext.Provider value={value}>{children}</BolaoContext.Provider>;
}

export function useBolaoContext(): BolaoContextValue {
  const context = React.useContext(BolaoContext);
  if (!context) {
    throw new Error("useBolaoContext must be used inside BolaoProvider");
  }
  return context;
}
