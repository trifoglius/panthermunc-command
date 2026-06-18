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
  const [bootstrapPassword, setBootstrapPassword] = useState("");
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
    return <p className="text-purple-800">Loading...</p>;
  }

  return (
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
          <div className="border-t border-purple-100 pt-4">
            <Input
              label="Bootstrap Admin Password"
              type="password"
              value={bootstrapPassword}
              onChange={(e) => setBootstrapPassword(e.target.value)}
              autoComplete="off"
              placeholder="Required to initialize system"
            />
            <p className="mt-1 text-xs text-purple-600">
              Only conference admins with the bootstrap password can initialize
              or recover the system.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full"
              onClick={handleBootstrap}
              disabled={bootstrapping || !bootstrapPassword}
            >
              {bootstrapping ? "Initializing..." : "Initialize / Recover Admin"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-purple-800">Loading...</p>}>
      <LoginForm />
    </Suspense>
  );
}
