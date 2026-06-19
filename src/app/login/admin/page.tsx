"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, LoadingScreen } from "@/components/ui";
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
    return <LoadingScreen message="Checking session..." />;
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
      <Card className="admin-card">
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
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-green-400" role="status">
              {info}
            </p>
          )}
          <Button
            type="submit"
            className="w-full border-neutral-200 bg-neutral-100 text-neutral-900 hover:bg-white"
            disabled={bootstrapping || !bootstrapPassword}
          >
            {bootstrapping ? "Initializing..." : "Initialize / Recover Admin"}
          </Button>
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
