import type { Metadata } from "next";
import { AlarmAudioProvider } from "@/components/AlarmAudioProvider";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "PantherMUNC Conference Management System",
  description:
    "Conference management system for PantherMUNC. Handles roll call, motions, documents, scoring, and Excel export.",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="classic"||t==="frutiger-aero"){document.documentElement.dataset.theme=t;}else{document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)};}}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)};}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AlarmAudioProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </AlarmAudioProvider>
      </body>
    </html>
  );
}
