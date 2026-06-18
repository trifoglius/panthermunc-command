import type { Metadata } from "next";
import { AlarmAudioProvider } from "@/components/AlarmAudioProvider";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "PantherMUNC Conference Management System",
  description:
    "Conference management system for PantherMUNC. Handles roll call, motions, documents, scoring, and Excel export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans">
        <AlarmAudioProvider>
          <AuthProvider>{children}</AuthProvider>
        </AlarmAudioProvider>
      </body>
    </html>
  );
}
