import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui";
import { ConferenceProvider } from "@/context/ConferenceContext";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ConferenceProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </ConferenceProvider>
  );
}
