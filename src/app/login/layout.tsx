import { LoginLayoutShell } from "@/components/login/LoginLayoutShell";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LoginLayoutShell>{children}</LoginLayoutShell>;
}
