"use client";

import { useEffect } from "react";

const SESSION_STORAGE_KEY = "nh_rec_session_id";

export function getOrCreateSessionId() {
  if (typeof window === "undefined") return null;
  try {
    let sid = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = "guest_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
      window.localStorage.setItem(SESSION_STORAGE_KEY, sid);
      // Also set cookie so Next.js server components / routes can read it if needed
      document.cookie = `nh_session_id=${sid}; path=/; max-age=31536000; SameSite=Lax`;
    }
    return sid;
  } catch {
    return null;
  }
}

export async function trackRecommendationClick(productId, strategy) {
  const sid = getOrCreateSessionId();
  try {
    await fetch("/api/recommendations/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sid ? { "x-session-id": sid } : {}),
      },
      body: JSON.stringify({
        productId,
        eventType: "RECOMMENDATION_CLICK",
        metadata: { strategy },
      }),
    });
  } catch {
    // Non-blocking background call
  }
}

export function ProductViewTracker({ productId }) {
  useEffect(() => {
    if (!productId) return;
    const sid = getOrCreateSessionId();

    const trackView = async () => {
      try {
        await fetch("/api/recommendations/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sid ? { "x-session-id": sid } : {}),
          },
          body: JSON.stringify({
            productId: Number(productId),
            eventType: "VIEW",
          }),
        });
      } catch {
        // Silently ignore network failures for background tracking
      }
    };

    const timer = setTimeout(trackView, 1000); // 1-second delay to ensure genuine view
    return () => clearTimeout(timer);
  }, [productId]);

  return null;
}
