"use client";

import { useEffect } from "react";

export function Tracker() {
  useEffect(() => {
    // Track page view once per session to avoid spamming the API
    // The backend also uses IP hashing to ensure unique visitor counts
    if (!sessionStorage.getItem("tracked_view")) {
      fetch("/api/track-view", { method: "POST" })
        .then(() => sessionStorage.setItem("tracked_view", "true"))
        .catch(() => {});
    }
  }, []);

  return null;
}
