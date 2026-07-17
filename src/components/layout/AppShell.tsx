"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { LoadingScreen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { useHeaderGlobeFlash } from "@/context/HeaderGlobeFlashContext";
import { useNotifications } from "@/hooks/useNotifications";

function NotificationBanner() {
  const { user, authLoading } = useAuth();
  const { loading } = useConference();
  const { setSustainedFlash } = useHeaderGlobeFlash();
  const { notifications, dismiss, dismissAll } = useNotifications(
    !authLoading && !loading && !!user?.committeeId
  );

  useEffect(() => {
    setSustainedFlash(notifications.length > 0 ? "notification" : null);
  }, [notifications.length, setSustainedFlash]);

  if (notifications.length === 0) return null;

  return (
    <div
      className="mx-4 mt-2 rounded-xl border border-blue-200/70 bg-blue-50/80 backdrop-blur-[var(--glass-blur)]"
      role="region"
      aria-label="Admin notifications"
    >
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-start justify-between gap-4 border-b border-blue-100 px-4 py-2 last:border-0"
        >
          <div className="flex items-start gap-2 text-sm text-blue-900">
            <span className="mt-0.5 shrink-0 rounded bg-blue-200 px-1.5 py-0.5 text-xs font-semibold text-blue-800">
              From Admin
            </span>
            <span>{n.message}</span>
          </div>
          <button
            type="button"
            onClick={() => dismiss(n.id)}
            className="shrink-0 text-xs text-blue-500 hover:text-blue-900"
          >
            Dismiss
          </button>
        </div>
      ))}
      {notifications.length > 1 && (
        <div className="px-4 py-1 text-right">
          <button
            type="button"
            onClick={dismissAll}
            className="text-xs text-blue-600 hover:text-blue-900"
          >
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}

function SyncErrorBanner() {
  const { syncError, clearSyncError } = useConference();
  if (!syncError) return null;

  return (
    <div
      className="mx-4 mt-2 flex items-center justify-between rounded-xl border border-yellow-200/70 bg-yellow-50/80 px-4 py-2 text-sm text-yellow-800 backdrop-blur-[var(--glass-blur)]"
      role="alert"
      aria-live="assertive"
    >
      <span>{syncError}</span>
      <button
        type="button"
        onClick={clearSyncError}
        className="ml-4 text-yellow-600 hover:text-yellow-900"
      >
        Dismiss
      </button>
    </div>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const { authLoading } = useAuth();
  const { loading } = useConference();

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="theme-surface app-shell-root">
      {/* Atmosphere is rendered inside the Three.js world */}
      <div className="theme-chrome app-shell-chrome relative z-50">
        <Header compact />
        <SyncErrorBanner />
        <NotificationBanner />
      </div>
      <div className="app-shell-main relative z-10">{children}</div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}
