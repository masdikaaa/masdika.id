"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { isUserOnline as checkIsUserOnline } from "./last-seen";

export interface RealtimeOnlineUser {
  id: number;
  name: string;
  email: string;
  image: string | null;
  role: string;
  lastActive: string;
}

export function useRealtimePresence() {
  const [onlineUsers, setOnlineUsers] = useState<RealtimeOnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/online-users", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOnlineUsers(data);
        }
      }
    } catch (err) {
      console.debug("Presence fetch error:", err);
    }
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isSubscribed = true;

    const startFallbackPolling = () => {
      if (fallbackIntervalRef.current) return;
      fetchOnlineUsers();
      fallbackIntervalRef.current = setInterval(fetchOnlineUsers, 5000);
    };

    const stopFallbackPolling = () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };

    try {
      if (typeof window !== "undefined" && "EventSource" in window) {
        eventSource = new EventSource("/api/admin/presence/stream");

        eventSource.onopen = () => {
          if (!isSubscribed) return;
          setIsConnected(true);
          stopFallbackPolling();
        };

        eventSource.addEventListener("init", (event: MessageEvent) => {
          if (!isSubscribed) return;
          try {
            const data: RealtimeOnlineUser[] = JSON.parse(event.data);
            setOnlineUsers(data);
          } catch (e) {
            console.error("Failed to parse presence init:", e);
          }
        });

        eventSource.addEventListener("ping", (event: MessageEvent) => {
          if (!isSubscribed) return;
          try {
            const pingUser: RealtimeOnlineUser = JSON.parse(event.data);
            setOnlineUsers((prev) => {
              const existingIdx = prev.findIndex((u) => u.id === pingUser.id);
              if (existingIdx !== -1) {
                const next = [...prev];
                next[existingIdx] = { ...next[existingIdx], ...pingUser };
                return next;
              }
              // Add to top of online list
              return [pingUser, ...prev];
            });

            // Dispatch global event for other components (e.g. Customers table)
            window.dispatchEvent(
              new CustomEvent("presence_user_ping", {
                detail: pingUser,
              })
            );
          } catch (e) {
            console.error("Failed to parse presence ping:", e);
          }
        });

        eventSource.addEventListener("sync", (event: MessageEvent) => {
          if (!isSubscribed) return;
          try {
            const data: RealtimeOnlineUser[] = JSON.parse(event.data);
            setOnlineUsers(data);
            window.dispatchEvent(
              new CustomEvent("presence_sync", {
                detail: data,
              })
            );
          } catch (e) {
            console.error("Failed to parse presence sync:", e);
          }
        });

        eventSource.onerror = () => {
          if (!isSubscribed) return;
          setIsConnected(false);
          // Fall back to polling when SSE drops
          startFallbackPolling();
        };
      } else {
        startFallbackPolling();
      }
    } catch {
      startFallbackPolling();
    }

    return () => {
      isSubscribed = false;
      if (eventSource) {
        eventSource.close();
      }
      stopFallbackPolling();
    };
  }, [fetchOnlineUsers]);

  const isUserOnline = useCallback(
    (userIdOrDate: number | string | Date | null | undefined) => {
      if (typeof userIdOrDate === "number") {
        const found = onlineUsers.find((u) => u.id === userIdOrDate);
        return found ? checkIsUserOnline(found.lastActive) : false;
      }
      return checkIsUserOnline(userIdOrDate);
    },
    [onlineUsers]
  );

  return {
    onlineUsers,
    isConnected,
    isUserOnline,
    refresh: fetchOnlineUsers,
  };
}

