"use client";

import { usePathname } from "next/navigation";
import { HomeAtmosphere } from "@/components/home/HomeAtmosphere";
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
      {!isAdminBootstrap && <HomeAtmosphere />}
      <RotatingGlobe />
      <div className="login-panel relative z-10 flex min-h-screen items-center justify-center px-4">
        <div key={pathname} className="login-panel-inner theme-glass px-6 py-7 sm:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
