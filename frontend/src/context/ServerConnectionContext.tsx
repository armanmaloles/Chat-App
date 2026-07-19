import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { getHealth } from "../lib/api";
import { ServerConnectionContext } from "./ServerConnectionContextValue";

export function ServerConnectionProvider({ children }: { children: ReactNode }) {
  const [isServerReachable, setIsServerReachable] = useState<boolean | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      await getHealth();
      setIsServerReachable(true);
    } catch {
      setIsServerReachable(false);
    }
  }, []);

  useEffect(() => {
    const loadConnection = async () => {
      try {
        await getHealth();
        setIsServerReachable(true);
      } catch {
        setIsServerReachable(false);
      }
    };

    void loadConnection();
  }, []);

  return (
    <ServerConnectionContext.Provider value={{ isServerReachable, checkConnection }}>
      {children}
    </ServerConnectionContext.Provider>
  );
}

