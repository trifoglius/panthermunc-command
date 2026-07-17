"use client";

import type { ReactNode } from "react";

export function PanelStage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel-stage mx-auto max-w-7xl ${className}`}>
      {children}
    </div>
  );
}
