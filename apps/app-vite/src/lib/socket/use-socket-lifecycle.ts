import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { appSession } from "@/lib/auth/session";
import { resolveSocketUrl, socketErrorData } from "./socket-context-helpers";

interface UseSocketLifecycleParams {
  enabled: boolean;
  token: string | null;
  isAuthenticated: boolean;
  logout: () => void;
}

interface UseSocketLifecycleResult {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
}

export function useSocketLifecycle({
  enabled,
  token,
  isAuthenticated,
  logout,
}: UseSocketLifecycleParams): UseSocketLifecycleResult {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const logoutRef = useRef(logout);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const connectTimeoutRef = useRef<number | null>(null);
  const authRecoveryInFlightRef = useRef(false);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const reconnectSocket = useCallback((newToken: string) => {
    if (socketRef.current) {
      socketRef.current.auth = { token: newToken };
      socketRef.current.connect();
    }
  }, []);

  const reconnect = useCallback(() => {
    if (token && socketRef.current) {
      reconnectSocket(token);
    }
  }, [reconnectSocket, token]);

  const recoverSocketAuth = useCallback(async () => {
    if (authRecoveryInFlightRef.current) return false;
    authRecoveryInFlightRef.current = true;

    try {
      const refreshed = await appSession.refreshAccessToken();
      if (!refreshed) return false;

      const refreshedToken = appSession.getToken();
      if (!refreshedToken) return false;

      reconnectSocket(refreshedToken);
      return true;
    } catch {
      return false;
    } finally {
      authRecoveryInFlightRef.current = false;
    }
  }, [reconnectSocket]);

  const handleAuthFailure = useCallback(
    async (socketInstance: Socket) => {
      const recovered = await recoverSocketAuth();
      if (!recovered) {
        await logoutRef.current();
        socketInstance.disconnect();
      }
    },
    [recoverSocketAuth],
  );

  useEffect(() => {
    if (!enabled || !isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = resolveSocketUrl();
    let cancelled = false;

    void (async () => {
      const { io } = await import("socket.io-client");
      if (cancelled) return;

      const socketInstance = io(socketUrl, {
        auth: { token },
        autoConnect: false,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socketInstance;

      socketInstance.on("connect", () => {
        setIsConnected(true);
      });

      socketInstance.on("disconnect", (reason: string) => {
        setIsConnected(false);

        if (reason === "io server disconnect") {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (token && socketRef.current) {
              reconnectSocket(token);
            }
          }, 1000);
        }
      });

      socketInstance.on("connect_error", (err: Error) => {
        setIsConnected(false);

        const errorPayload =
          err && typeof err === "object" ? socketErrorData(err) : undefined;

        if (
          err.message === "Unauthorized" ||
          errorPayload?.content?.message === "Unauthorized"
        ) {
          void handleAuthFailure(socketInstance);
        }
      });

      socketInstance.on("unauthorized", () => {
        void handleAuthFailure(socketInstance);
      });

      socketInstance.on("token_refresh", () => {
        if (token) {
          reconnectSocket(token);
        }
      });

      setSocket(socketInstance);

      connectTimeoutRef.current = window.setTimeout(() => {
        if (socketRef.current === socketInstance) {
          socketInstance.connect();
        }
      }, 0);
    })();

    return () => {
      cancelled = true;

      if (connectTimeoutRef.current !== null) {
        window.clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }

      const current = socketRef.current;
      if (current) {
        if (current.connected) {
          current.disconnect();
        } else {
          current.off();
        }
        socketRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled, token, isAuthenticated, reconnectSocket, handleAuthFailure]);

  return { socket, isConnected, reconnect };
}
