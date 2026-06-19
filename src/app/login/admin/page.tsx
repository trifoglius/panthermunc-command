"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Input } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export default function AdminBootstrapPage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const [bootstrapPassword, setBootstrapPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [bootstrapping, setBootstrapping] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const handleBootstrap = async () => {
    if (!bootstrapPassword) return;
    setError("");
    setInfo("");
    setBootstrapping(true);
    try {
      const r = await fetch("/api/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: bootstrapPassword }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.status === 403) {
        setError(body?.error ?? "Invalid bootstrap admin password");
        return;
      }
      if (r.status === 409) {
        setInfo(
          "System is already initialized. If login still fails, your admin password may have changed."
        );
        return;
      }
      if (!r.ok) {
        setError(body?.error ?? "Failed to initialize system");
        return;
      }
      setInfo(
        "System initialized. Sign in using the bootstrap admin credentials."
      );
      setBootstrapPassword("");
    } catch {
      setError("Failed to initialize system");
    } finally {
      setBootstrapping(false);
    }
  };

  if (authLoading) {
    return <p className="text-neutral-300">Loading...</p>;
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-neutral-100">
          Admin Initialization
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Initialize or recover the admin account
        </p>
      </div>
      <Card className="!border-neutral-700 !bg-neutral-900 [&_input]:border-neutral-600 [&_input]:bg-neutral-950 [&_input]:text-neutral-100 [&_input]:placeholder:text-neutral-500 [&_input]:focus:border-neutral-300 [&_input]:focus:ring-neutral-300 [&_label>span]:text-neutral-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleBootstrap();
          }}
          className="grid gap-4"
        >
          <Input
            label="Bootstrap Admin Password"
            type="password"
            value={bootstrapPassword}
            onChange={(e) => setBootstrapPassword(e.target.value)}
            autoComplete="off"
            autoFocus
            placeholder="Required to initialize system"
          />
          <p className="-mt-2 text-xs text-neutral-400">
            Only conference admins with the bootstrap password can initialize
            or recover the system.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-green-400">{info}</p>}
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 px-4 py-2 text-base font-medium text-neutral-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={bootstrapping || !bootstrapPassword}
          >
            {bootstrapping ? "Initializing..." : "Initialize / Recover Admin"}
          </button>
          <Link
            href="/login"
            className="text-center text-sm text-neutral-400 underline-offset-2 hover:text-neutral-100 hover:underline"
          >
            Back to sign in
          </Link>
        </form>
      </Card>
    </div>
  );
}
