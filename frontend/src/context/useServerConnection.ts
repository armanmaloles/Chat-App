import { useContext } from "react";
import { ServerConnectionContext } from "./ServerConnectionContextValue";
import type { ServerConnectionContextType } from "./ServerConnectionContextValue";

export function useServerConnection() {
  const context = useContext<ServerConnectionContextType | undefined>(ServerConnectionContext);
  if (!context) {
    throw new Error(
      "useServerConnection must be used within ServerConnectionProvider",
    );
  }
  return context;
}
