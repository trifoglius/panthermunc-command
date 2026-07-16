"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input, LoadingScreen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const { user, authLoading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(searchParams.get("from") ?? "/");
    }
  }, [user, authLoading, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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

  if (authLoading) {
    return <LoadingScreen message="Checking session..." />;
  }

  return (
    <>
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
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting || !username || !password}
            >
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Card>

        <div className="theme-glass mt-6 p-4 text-center text-sm text-purple-800">
          <p className="font-medium text-purple-900">First time setup?</p>
          <p className="mt-1 text-purple-600">
            Initialize the admin account before signing in.
          </p>
          <Link
            href="/login/admin"
            className="ui-btn-secondary mt-3 inline-block rounded-md border border-purple-300 px-4 py-2 font-medium text-purple-800 hover:bg-purple-50"
          >
            Admin initialization
          </Link>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading login..." />}>
      <LoginForm />
    </Suspense>
  );
}
