import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ConferenceProvider } from "@/context/ConferenceContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "PantherMUNC Command",
  description:
    "Conference management tool for PantherMUNC — roll call, motions, documents, scoring, and Excel export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <ConferenceProvider>{children}</ConferenceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
