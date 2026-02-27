"use client";

import { createContext, useContext, useEffect, useState } from "react";

const WSContext = createContext<WebSocket | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);

    socket.onopen = () => console.log("WS Connected");
    socket.onclose = () => console.log("WS Closed");

    setWs(socket);
  }, []);

  return <WSContext.Provider value={ws}>{children}</WSContext.Provider>;
}

export function useWS() {
  return useContext(WSContext);
}