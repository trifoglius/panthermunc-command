/**
 * Generic client for version-checked committee resource routes (Phase 3+).
 *
 * Normalized entity routes (delegates, motions, scores, ...) all share the same
 * optimistic-write contract: a 2xx returns the written entity, and a 409
 * carries `{ latest }` so the caller can reconcile. This helper centralizes
 * that shape so per-resource clients stay thin.
 */
export type ResourceResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "conflict"; latest: unknown }
  | { ok: false; reason: "error"; status: number };

export async function resourceRequest<T>(
  url: string,
  init?: RequestInit
): Promise<ResourceResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: init?.body
        ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
        : init?.headers,
      ...init,
    });
  } catch {
    return { ok: false, reason: "error", status: 0 };
  }

  if (response.ok) {
    return { ok: true, data: (await response.json()) as T };
  }

  if (response.status === 409) {
    let latest: unknown;
    try {
      latest = (await response.json())?.latest;
    } catch {
      // no body
    }
    return { ok: false, reason: "conflict", latest };
  }

  return { ok: false, reason: "error", status: response.status };
}
