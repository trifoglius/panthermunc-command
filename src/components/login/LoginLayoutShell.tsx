"use client";

import { usePathname } from "next/navigation";
import { RotatingGlobe } from "@/components/login/RotatingGlobe";

export function LoginLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminBootstrap = pathname === "/login/admin";

  return (
    <div
      className={`login-shell relative min-h-screen overflow-hidden${
        isAdminBootstrap ? " login-theme-admin" : ""
      }`}
    >
      <RotatingGlobe />
      <div className="login-panel flex min-h-screen items-center justify-center px-4">
        <div key={pathname} className="login-panel-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
