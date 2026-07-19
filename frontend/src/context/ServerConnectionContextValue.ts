import { createContext } from "react";

export type ServerConnectionContextType = {
  isServerReachable: boolean | null;
  checkConnection: () => Promise<void>;
};

export const ServerConnectionContext = createContext<ServerConnectionContextType | undefined>(
  undefined,
);
