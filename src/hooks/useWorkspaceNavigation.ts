"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TabId } from "@/lib/workspace-url";
import {
  getDefaultTab,
  getVisibleTabs,
  isValidTabId,
} from "@/lib/workspace-url";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { canAccessAllCommittees } from "@/lib/permissions";

export type WorkspaceView = "conference-home" | "committee-home" | "panel";

export function useWorkspaceNavigation() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { conference, activeCommittee, selectCommittee, loading } =
    useConference();

  const committeeParam = searchParams.get("committee");
  const tabParam = searchParams.get("tab");

  const visibleTabs = useMemo(
    () => (user ? getVisibleTabs(user) : []),
    [user]
  );

  /** Active panel tab when a tab is in the URL; null on home views. */
  const activeTab: TabId | null = useMemo(() => {
    if (!user || !tabParam) return null;
    if (isValidTabId(tabParam) && visibleTabs.includes(tabParam)) {
      return tabParam;
    }
    return null;
  }, [tabParam, user, visibleTabs]);

  const view: WorkspaceView = useMemo(() => {
    if (!committeeParam) return "conference-home";
    if (!tabParam || !activeTab) return "committee-home";
    return "panel";
  }, [committeeParam, tabParam, activeTab]);

  const buildUrl = useCallback(
    (params: {
      committee?: string | null;
      tab?: TabId | null;
      clearTab?: boolean;
    }) => {
      const next = new URLSearchParams();
      const committee =
        params.committee !== undefined
          ? params.committee
          : searchParams.get("committee");

      if (committee) next.set("committee", committee);

      if (params.clearTab) {
        // omit tab
      } else if (params.tab !== undefined) {
        if (params.tab) next.set("tab", params.tab);
      } else {
        const existing = searchParams.get("tab");
        if (existing) next.set("tab", existing);
      }

      const qs = next.toString();
      return `/${qs ? `?${qs}` : ""}`;
    },
    [searchParams]
  );

  const replaceUrl = useCallback(
    (params: {
      committee?: string | null;
      tab?: TabId | null;
      clearTab?: boolean;
    }) => {
      router.replace(buildUrl(params));
    },
    [router, buildUrl]
  );

  useEffect(() => {
    if (loading || !conference || !user) return;

    if (committeeParam) {
      const exists = conference.committees.some((c) => c.id === committeeParam);
      if (!exists) {
        replaceUrl({ committee: null, clearTab: true });
        return;
      }
      if (activeCommittee?.id !== committeeParam) {
        void selectCommittee(committeeParam);
      }
    }
  }, [
    committeeParam,
    conference,
    loading,
    user,
    activeCommittee?.id,
    selectCommittee,
    replaceUrl,
  ]);

  // Fix invalid tab params; do not auto-inject a tab (homes are intentional).
  useEffect(() => {
    if (loading || !user || pathname !== "/") return;
    if (!tabParam) return;

    const invalid =
      !isValidTabId(tabParam) || !visibleTabs.includes(tabParam as TabId);
    if (invalid) {
      replaceUrl({
        committee: committeeParam,
        clearTab: true,
      });
    }
  }, [
    loading,
    user,
    pathname,
    tabParam,
    committeeParam,
    visibleTabs,
    replaceUrl,
  ]);

  // Single-committee users: land on committee home when no committee in URL.
  useEffect(() => {
    if (loading || !user || !conference || pathname !== "/") return;
    if (committeeParam) return;
    if (canAccessAllCommittees(user)) return;
    if (user.committeeId) {
      replaceUrl({ committee: user.committeeId, clearTab: true });
    } else if (activeCommittee) {
      replaceUrl({ committee: activeCommittee.id, clearTab: true });
    }
  }, [
    loading,
    user,
    conference,
    pathname,
    committeeParam,
    activeCommittee,
    replaceUrl,
  ]);

  const setActiveTab = useCallback(
    (tab: TabId) => {
      replaceUrl({
        tab,
        committee: activeCommittee?.id ?? committeeParam,
      });
    },
    [replaceUrl, activeCommittee?.id, committeeParam]
  );

  const selectCommitteeHome = useCallback(
    async (id: string) => {
      await selectCommittee(id);
      replaceUrl({ committee: id, clearTab: true });
    },
    [selectCommittee, replaceUrl]
  );

  const selectCommitteeWithUrl = useCallback(
    async (id: string) => {
      await selectCommitteeHome(id);
    },
    [selectCommitteeHome]
  );

  const goToCommitteeHome = useCallback(() => {
    replaceUrl({
      committee: activeCommittee?.id ?? committeeParam,
      clearTab: true,
    });
  }, [replaceUrl, activeCommittee?.id, committeeParam]);

  const goToConferenceHome = useCallback(() => {
    replaceUrl({ committee: null, clearTab: true });
  }, [replaceUrl]);

  const navigateToWorkspace = useCallback(
    (tab?: TabId) => {
      const nextTab = tab ?? (user ? getDefaultTab(user) : "delegates");
      const committee = activeCommittee?.id ?? committeeParam ?? "";
      router.push(
        `/?committee=${encodeURIComponent(committee)}&tab=${nextTab}`
      );
    },
    [activeCommittee?.id, committeeParam, router, user]
  );

  return {
    view,
    activeTab,
    setActiveTab,
    selectCommitteeWithUrl,
    selectCommitteeHome,
    goToCommitteeHome,
    goToConferenceHome,
    visibleTabs,
    navigateToWorkspace,
    committeeParam,
    tabParam,
  };
}
