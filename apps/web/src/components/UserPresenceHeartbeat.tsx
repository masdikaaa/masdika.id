"use client";

import { useEffect, useRef } from "react";

export function UserPresenceHeartbeat() {
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    const sendPing = async () => {
      // Throttle pings to at most once every 10 seconds
      const now = Date.now();
      if (now - lastPingRef.current < 10000) return;
      lastPingRef.current = now;

      try {
        await fetch("/api/user/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
      } catch {
        // Silently ignore ping errors (e.g. offline, guest visitor)
      }
    };

    // 1. Initial ping on mount
    sendPing();

    // 2. Periodic heartbeat every 25 seconds while document is visible
    const interval = setInterval(() => {
      if (!isMounted) return;
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        sendPing();
      }
    }, 25000);

    // 3. React instantly when tab or window becomes visible/focused
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendPing();
      }
    };

    const handleFocus = () => {
      sendPing();
    };

    // 4. React on active user interaction (throttled)
    const handleUserInteraction = () => {
      sendPing();
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction, { passive: true });

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };
  }, []);

  return null;
}

