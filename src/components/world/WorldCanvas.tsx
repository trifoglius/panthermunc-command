"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const WorldStage = dynamic(
  () =>
    import("@/components/world/WorldScene").then((m) => m.WorldStage),
  {
    ssr: false,
    loading: () => (
      <div className="world-stage home-stage world-stage-loading" aria-busy>
        <div className="world-stage-loading-inner">
          <p className="text-sm font-medium text-[color:var(--purple-primary)]">
            Loading world…
          </p>
        </div>
      </div>
    ),
  }
);

export function WorldCanvas(props: ComponentProps<typeof WorldStage>) {
  return <WorldStage {...props} />;
}

export { requestWorldSelect } from "@/components/world/WorldScene";
