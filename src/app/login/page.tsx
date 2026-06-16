"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const { user, authLoading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  // Already logged in — redirect away
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(searchParams.get("from") ?? "/");
    }
  }, [user, authLoading, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      router.replace(searchParams.get("from") ?? "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBootstrap = async () => {
    setError("");
    setInfo("");
    setBootstrapping(true);
    try {
      const r = await fetch("/api/bootstrap", { method: "POST" });
      const body = await r.json().catch(() => ({}));
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
    } catch {
      setError("Failed to initialize system");
    } finally {
      setBootstrapping(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-purple-800">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-purple-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-purple-900">
            PantherMUNC Conference Management System
          </h1>
          <p className="mt-1 text-sm text-purple-600">Sign in to continue</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-700">{info}</p>}
            <Button
              type="submit"
              disabled={submitting || !username || !password}
            >
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleBootstrap}
              disabled={bootstrapping}
            >
              {bootstrapping ? "Initializing..." : "Initialize / Recover Admin"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-purple-800">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
