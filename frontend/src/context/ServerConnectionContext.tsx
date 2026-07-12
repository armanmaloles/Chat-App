import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { getHealth } from "../api";

type ServerConnectionContextType = {
  isServerReachable: boolean | null;
  checkConnection: () => Promise<void>;
};

const ServerConnectionContext = createContext<ServerConnectionContextType | undefined>(
  undefined
);

export function ServerConnectionProvider({ children }: { children: ReactNode }) {
  const [isServerReachable, setIsServerReachable] = useState<boolean | null>(null);

  const checkConnection = async () => {
    try {
      await getHealth();
      setIsServerReachable(true);
    } catch {
      setIsServerReachable(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <ServerConnectionContext.Provider value={{ isServerReachable, checkConnection }}>
      {children}
    </ServerConnectionContext.Provider>
  );
}

export function useServerConnection() {
  const context = useContext(ServerConnectionContext);
  if (!context) {
    throw new Error(
      "useServerConnection must be used within ServerConnectionProvider"
    );
  }
  return context;
}
