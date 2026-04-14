import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "cal-sans/index.css";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/lib/settings-context";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Ollama Manager",
  description: "Zarządzaj i testuj lokalne modele Ollama",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white text-[#242424] font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
          <TooltipProvider>
            <SettingsProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Toaster position="bottom-right" richColors closeButton />
            </SettingsProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
