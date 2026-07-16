"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { useHeaderGlobeFlash } from "@/context/HeaderGlobeFlashContext";
import { exportConferenceLogs } from "@/lib/conference-logs-export";
import {
  exportCommitteeToExcel,
  exportFullConferenceToExcel,
} from "@/lib/excel-export";
import { hasPermission } from "@/lib/permissions";
import {
  Button,
  Card,
  Input,
  LinkButton,
  Select,
  useToast,
} from "@/components/ui";
import { HeaderDotMatrix } from "@/components/layout/HeaderDotMatrix";
import { ThemeMenu } from "@/components/layout/ThemeMenu";
import { RotatingGlobe } from "@/components/login/RotatingGlobe";
import type { CommitteeType } from "@/lib/types";

export function Header() {
  const { user, logout, authLoading } = useAuth();
  const { conference, createCommittee, activeCommittee } = useConference();
  const { flash, flashKey, sustainedFlash } = useHeaderGlobeFlash();
  const { success } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CommitteeType>("ga");
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const canManageConference = user ? hasPermission(user, "conference:manage") : false;
  const canManageUsers = user ? hasPermission(user, "users:manage") : false;
  const canExportAll = user ? hasPermission(user, "export:all") : false;

  useEffect(() => {
    if (!showExportMenu) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showExportMenu]);

  const handleAddCommittee = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createCommittee(name.trim(), type, topic.trim(), type === "ga");
      success(`Committee "${name.trim()}" created`);
    } finally {
      setName("");
      setTopic("");
      setCreating(false);
      setShowAdd(false);
      setShowMobileMenu(false);
    }
  };

  const handleExportCommittee = () => {
    if (!activeCommittee) return;
    exportCommitteeToExcel(activeCommittee);
    success("Committee Excel exported");
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };

  const handleExportAll = () => {
    if (!conference) return;
    exportFullConferenceToExcel(conference);
    success("Full conference Excel exported");
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };

  const handleExportLogs = () => {
    if (!conference) return;
    exportConferenceLogs(conference);
    success("Conference logs exported");
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };

  const headerBtnClass =
    "border-white/30 bg-white text-purple-900 hover:bg-purple-50";

  const actionButtons = (
    <>
      {canManageConference && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className={headerBtnClass}
        >
          Add Committee
        </Button>
      )}
      {conference && (canExportAll || activeCommittee) && (
        <div className="relative z-20" ref={exportRef}>
          <Button
            variant="secondary"
            size="sm"
            className={headerBtnClass}
            onClick={() => setShowExportMenu((v) => !v)}
            aria-expanded={showExportMenu}
            aria-haspopup="menu"
          >
            Export
          </Button>
          {showExportMenu && (
            <div
              role="menu"
              className="theme-menu absolute right-0 z-20 mt-1 min-w-[12rem] py-1"
            >
              {activeCommittee && (
                <button
                  type="button"
                  role="menuitem"
                  className="theme-menu-item block w-full px-4 py-2 text-left text-sm"
                  onClick={handleExportCommittee}
                >
                  Committee Excel
                </button>
              )}
              {canExportAll && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="theme-menu-item block w-full px-4 py-2 text-left text-sm"
                    onClick={handleExportAll}
                  >
                    Full Conference Excel
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="theme-menu-item block w-full px-4 py-2 text-left text-sm"
                    onClick={handleExportLogs}
                  >
                    Conference Logs
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {canManageConference && (
        <LinkButton href="/settings" variant="secondary" size="sm" className={headerBtnClass}>
          Manage Conference
        </LinkButton>
      )}
      {canManageUsers && (
        <LinkButton href="/admin/users" variant="secondary" size="sm" className={headerBtnClass}>
          Users
        </LinkButton>
      )}
    </>
  );

  return (
    <header className="theme-header relative border-b text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <HeaderDotMatrix />
      </div>
      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <RotatingGlobe
            variant="header"
            flash={flash}
            flashKey={flashKey}
            sustainedFlash={sustainedFlash}
            size={42}
          />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold md:text-xl">
              PantherMUNC Conference Management System
            </h1>
            <p className="truncate text-xs text-purple-200 md:text-sm">
              {conference
                ? `${conference.name} ${conference.year}`
                : "Conference Management"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {conference && (
            <div className="hidden items-center gap-2 md:flex">{actionButtons}</div>
          )}

          {conference && (
            <div className="md:hidden">
              <Button
                variant="secondary"
                size="sm"
                className={headerBtnClass}
                onClick={() => setShowMobileMenu((v) => !v)}
                aria-expanded={showMobileMenu}
              >
                Actions
              </Button>
            </div>
          )}

          {!authLoading && (
            <div
              className={`flex items-center gap-2 ${user ? "border-l border-purple-600/60 pl-2" : ""}`}
            >
              {user && (
                <>
                  <span className="hidden text-xs text-purple-200 sm:inline">
                    {user.displayName}{" "}
                    <span className="rounded bg-purple-700/80 px-1 py-0.5 text-purple-100">
                      {user.role}
                    </span>
                  </span>
                  <ThemeMenu buttonClassName={headerBtnClass} />
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="!text-purple-200 hover:!text-white"
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>

      {showMobileMenu && conference && (
        <div className="relative z-10 flex flex-wrap gap-2 border-t border-purple-700/50 px-4 py-3 md:hidden">
          {actionButtons}
        </div>
      )}

      {showAdd && canManageConference && conference && (
        <div className="relative z-10 border-t border-purple-700/50 bg-[var(--menu-bg)] px-4 py-4 text-gray-900 backdrop-blur-[var(--glass-blur)]">
          <div className="mx-auto max-w-3xl">
            <Card title="New Committee">
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Select
                  label="Type"
                  value={type}
                  onChange={(e) => setType(e.target.value as CommitteeType)}
                  options={[
                    { value: "ga", label: "GA" },
                    { value: "crisis", label: "Crisis" },
                    { value: "specialized", label: "Specialized" },
                  ]}
                />
                <Input
                  label="Topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <div className="flex items-end gap-2">
                  <Button onClick={handleAddCommittee} disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAdd(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </header>
  );
}
