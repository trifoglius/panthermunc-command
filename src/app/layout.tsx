import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Serif_4 } from "next/font/google";
import { UiAudioProvider } from "@/components/UiAudioProvider";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { DEFAULT_THEME, THEME_IDS, THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const classyDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-classy-display",
  display: "swap",
});

const classyBody = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-classy-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PantherMUNC Conference Management System",
  description:
    "Conference management system for PantherMUNC. Handles roll call, motions, documents, scoring, and Excel export.",
};

const allowedThemesJson = JSON.stringify(THEME_IDS);

const themeInitScript = `(function(){try{var allowed=${allowedThemesJson};var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(allowed.indexOf(t)!==-1){document.documentElement.dataset.theme=t;}else{document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)};}}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)};}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full ${classyDisplay.variable} ${classyBody.variable}`}
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <UiAudioProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </UiAudioProvider>
      </body>
    </html>
  );
}
