"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

// Create socket instance outside component to avoid recreation
let socketInstance: Socket | null = null;
let isSocketConnected = false;
const subscribers = new Set<() => void>();

function getOrCreateSocket() {
  if (typeof window === "undefined") return null;

  if (!socketInstance) {
    try {
      const token = localStorage.getItem("docita_token");
      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

      socketInstance = io(socketUrl, {
        auth: token ? { token } : {},
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socketInstance.on("connect", () => {
        isSocketConnected = true;
        subscribers.forEach((callback) => callback());
      });

      socketInstance.on("disconnect", () => {
        isSocketConnected = false;
        subscribers.forEach((callback) => callback());
      });

      socketInstance.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        isSocketConnected = false;
        subscribers.forEach((callback) => callback());
      });
    } catch (error) {
      console.error("Failed to initialize socket:", error);
    }
  }

  return socketInstance;
}

function subscribeToSocket(callback: () => void) {
  subscribers.add(callback);
  // Ensure socket is created on first subscription
  getOrCreateSocket();

  return () => {
    subscribers.delete(callback);
    // Clean up socket if no more subscribers
    if (subscribers.size === 0 && socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      isSocketConnected = false;
    }
  };
}

const serverSnapshot = { socket: null, isConnected: false };

function getSocketSnapshot() {
  return { socket: socketInstance, isConnected: isSocketConnected };
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState(() => getSocketSnapshot());

  const subscribe = useCallback((callback: () => void) => {
    return subscribeToSocket(() => {
      setSnapshot(getSocketSnapshot());
      callback();
    });
  }, []);

  const getSnapshot = useCallback(() => snapshot, [snapshot]);

  const { socket, isConnected } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => serverSnapshot,
  );

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
