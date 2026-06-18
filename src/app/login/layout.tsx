import { RotatingGlobe } from "@/components/login/RotatingGlobe";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-purple-50">
      <RotatingGlobe />
      <div className="login-panel flex min-h-screen items-center justify-center px-4">
        {children}
      </div>
    </div>
  );
}
