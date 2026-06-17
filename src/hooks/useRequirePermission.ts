"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hasPermission, type Permission } from "@/lib/permissions";

/**
 * Redirects to "/" if the current user does not have `permission`.
 * Returns { allowed, loading } so the page can gate its render.
 */
export function useRequirePermission(permission: Permission): {
  allowed: boolean;
  loading: boolean;
} {
  const { user, authLoading } = useAuth();
  const router = useRouter();

  const allowed = !authLoading && !!user && hasPermission(user, permission);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !hasPermission(user, permission)) {
      router.replace("/");
    }
  }, [user, authLoading, permission, router]);

  return { allowed, loading: authLoading };
}
