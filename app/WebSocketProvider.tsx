"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

type WSContextType = {
  ready: boolean;
  send: (message: object) => void;
  addMessageListener: (handler: (data: unknown) => void) => () => void;
};

const WSContext = createContext<WSContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [ready, setReady] = useState(false);
  const listenersRef = useRef<((data: unknown) => void)[]>([]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL;
    if (!url) {
      console.error("NEXT_PUBLIC_WS_URL is not set");
      return;
    }

    const socket = new WebSocket(url);
    wsRef.current = socket;

    const onOpen = () => setReady(true);
    const onClose = () => setReady(false);
    const onMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as unknown;
        listenersRef.current.forEach((listener) => listener(data));
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      socket.close();
      wsRef.current = null;
      setReady(false);
    };
  }, []);

  const send = useCallback((message: object) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not open, message not sent");
    }
  }, []);

  const addMessageListener = useCallback((handler: (data: unknown) => void) => {
    listenersRef.current.push(handler);
    return () => {
      listenersRef.current = listenersRef.current.filter((h) => h !== handler);
    };
  }, []);

  return (
    <WSContext.Provider value={{ ready, send, addMessageListener }}>
      {children}
    </WSContext.Provider>
  );
}

export function useWS() {
  return useContext(WSContext);
}
