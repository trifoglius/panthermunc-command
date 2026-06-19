import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui";
import { ConferenceProvider } from "@/context/ConferenceContext";
import {
  HeaderGlobeFlashProvider,
  HeaderGlobeFlashWatcher,
} from "@/context/HeaderGlobeFlashContext";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ConferenceProvider>
      <HeaderGlobeFlashProvider>
        <HeaderGlobeFlashWatcher />
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </HeaderGlobeFlashProvider>
    </ConferenceProvider>
  );
}
