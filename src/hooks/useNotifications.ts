"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface NotificationItem {
  id: string;
  message: string;
  committeeIds: string[] | null;
  createdAt: string;
  createdBy: string;
}

const POLL_INTERVAL = 10_000; // 10 seconds

export function useNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const latestRef = useRef<string>("");

  const poll = useCallback(async () => {
    try {
      const url = latestRef.current
        ? `/api/notifications?since=${encodeURIComponent(latestRef.current)}`
        : "/api/notifications";
      const res = await fetch(url);
      if (!res.ok) return;
      const items: NotificationItem[] = await res.json();
      if (items.length > 0) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const fresh = items.filter((n) => !existingIds.has(n.id));
          return fresh.length ? [...fresh, ...prev] : prev;
        });
        // Track the most recent timestamp seen
        const latest = items.reduce(
          (max, n) => (n.createdAt > max ? n.createdAt : max),
          latestRef.current
        );
        latestRef.current = latest;
      }
    } catch {
      // non-fatal: network blip
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, poll]);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const dismissAll = useCallback(() => {
    setDismissed((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
  }, [notifications]);

  const visible = notifications.filter((n) => !dismissed.has(n.id));

  return { notifications: visible, dismiss, dismissAll, refresh: poll };
}
