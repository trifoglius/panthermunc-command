"use client";

import Link from "next/link";
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
    return <p className="text-purple-800">Loading...</p>;
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              disabled={submitting || !username || !password}
            >
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Card>
      </div>
      <Link
        href="/login/admin"
        className="fixed bottom-4 right-4 z-20 rounded-md border border-purple-200 bg-white/90 px-3 py-1.5 text-sm text-purple-700 shadow-sm backdrop-blur-sm transition-[background-color,color,border-color] duration-[450ms] ease-in-out hover:bg-white hover:text-purple-900"
      >
        Admin setup
      </Link>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-purple-800">Loading...</p>}>
      <LoginForm />
    </Suspense>
  );
}
