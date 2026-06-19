"use client";

import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CommitteeNav } from "@/components/layout/CommitteeNav";
import { Header } from "@/components/layout/Header";
import { LoadingScreen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { useHeaderGlobeFlash } from "@/context/HeaderGlobeFlashContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useWorkspaceNavigation } from "@/hooks/useWorkspaceNavigation";
import { canAccessAllCommittees } from "@/lib/permissions";

function NotificationBanner() {
  const { user, authLoading } = useAuth();
  const { loading } = useConference();
  const { triggerFlash } = useHeaderGlobeFlash();
  const seenIdsRef = useRef<Set<string> | null>(null);
  const { notifications, dismiss, dismissAll } = useNotifications(
    !authLoading && !loading && !!user?.committeeId
  );

  useEffect(() => {
    const currentIds = new Set(notifications.map((n) => n.id));
    if (seenIdsRef.current === null) {
      seenIdsRef.current = currentIds;
      return;
    }

    for (const id of currentIds) {
      if (!seenIdsRef.current.has(id)) {
        triggerFlash("notification");
        break;
      }
    }

    seenIdsRef.current = currentIds;
  }, [notifications, triggerFlash]);

  if (notifications.length === 0) return null;

  return (
    <div className="border-b border-blue-200 bg-blue-50" role="region" aria-label="Admin notifications">
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
      className="flex items-center justify-between border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800"
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

function AppShellNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { conference, activeCommittee, loading } = useConference();
  const nav = useWorkspaceNavigation();

  if (loading || !conference || !user || conference.committees.length === 0) {
    return null;
  }

  const hideCommitteeNav =
    pathname === "/settings" || pathname.startsWith("/admin/users");

  if (hideCommitteeNav) return null;

  const showTabs = pathname === "/";
  const showCommitteeNav =
    showTabs ||
    canAccessAllCommittees(user) ||
    !!activeCommittee;

  if (!showCommitteeNav) return null;

  return (
    <CommitteeNav
      activeTab={nav.activeTab}
      onTabChange={nav.setActiveTab}
      onSelectCommittee={nav.selectCommitteeWithUrl}
      showTabs={showTabs}
    />
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const { authLoading } = useAuth();
  const { loading } = useConference();

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="sticky top-0 z-50 bg-[var(--surface)] shadow-sm">
        <Header />
        <SyncErrorBanner />
        <NotificationBanner />
        <AppShellNav />
      </div>
      {children}
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

export function CommitteePickerCard() {
  const { user } = useAuth();
  const { conference } = useConference();
  const nav = useWorkspaceNavigation();

  if (!user || !conference || !canAccessAllCommittees(user)) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-purple-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-purple-900">Select a committee</h2>
        <p className="mt-2 text-sm text-purple-700">
          Choose a committee to open its workspace.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {conference.committees.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void nav.selectCommitteeWithUrl(c.id)}
              className="rounded-md border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-800 hover:bg-purple-50"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
