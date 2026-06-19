"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TabId } from "@/lib/workspace-url";
import {
  getDefaultTab,
  getVisibleTabs,
  isValidTabId,
  resolveActiveTab,
} from "@/lib/workspace-url";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";

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

  const activeTab: TabId = useMemo(() => {
    if (!user) return "delegates";
    return resolveActiveTab(tabParam, user);
  }, [tabParam, user]);

  const buildUrl = useCallback(
    (params: { committee?: string | null; tab?: TabId }) => {
      const next = new URLSearchParams(searchParams.toString());
      if (params.committee !== undefined) {
        if (params.committee) next.set("committee", params.committee);
        else next.delete("committee");
      }
      if (params.tab !== undefined) {
        next.set("tab", params.tab);
      }
      const qs = next.toString();
      return `${pathname}${qs ? `?${qs}` : ""}`;
    },
    [pathname, searchParams]
  );

  const replaceUrl = useCallback(
    (params: { committee?: string | null; tab?: TabId }) => {
      router.replace(buildUrl(params));
    },
    [router, buildUrl]
  );

  useEffect(() => {
    if (loading || !conference || !user) return;

    if (committeeParam) {
      const exists = conference.committees.some((c) => c.id === committeeParam);
      if (exists && activeCommittee?.id !== committeeParam) {
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
  ]);

  useEffect(() => {
    if (loading || !user || pathname !== "/") return;

    const needsTab =
      !tabParam ||
      !isValidTabId(tabParam) ||
      !visibleTabs.includes(tabParam as TabId);
    const needsCommittee =
      !!activeCommittee && committeeParam !== activeCommittee.id;

    if (needsTab || needsCommittee) {
      replaceUrl({
        committee: committeeParam ?? activeCommittee?.id ?? null,
        tab: needsTab ? activeTab : (tabParam as TabId),
      });
    }
  }, [
    loading,
    user,
    pathname,
    tabParam,
    committeeParam,
    visibleTabs,
    activeTab,
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

  const selectCommitteeWithUrl = useCallback(
    async (id: string) => {
      await selectCommittee(id);
      replaceUrl({ committee: id, tab: activeTab });
    },
    [selectCommittee, replaceUrl, activeTab]
  );

  const navigateToWorkspace = useCallback(
    (tab?: TabId) => {
      const nextTab = tab ?? (user ? getDefaultTab(user) : "delegates");
      replaceUrl({
        committee: activeCommittee?.id ?? committeeParam,
        tab: nextTab,
      });
      if (pathname !== "/") {
        router.push(
          `/?committee=${encodeURIComponent(activeCommittee?.id ?? committeeParam ?? "")}&tab=${nextTab}`
        );
      }
    },
    [replaceUrl, activeCommittee?.id, committeeParam, pathname, router, user]
  );

  return {
    activeTab,
    setActiveTab,
    selectCommitteeWithUrl,
    visibleTabs,
    navigateToWorkspace,
    committeeParam,
  };
}
