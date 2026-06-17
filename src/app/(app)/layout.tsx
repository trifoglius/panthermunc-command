import { ConferenceProvider } from "@/context/ConferenceContext";
import type { ReactNode } from "react";

// This layout wraps all authenticated pages (/, /settings, /admin/*).
// /login lives outside this group and doesn't load conference state.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <ConferenceProvider>{children}</ConferenceProvider>;
}
