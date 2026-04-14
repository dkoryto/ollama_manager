"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Cpu, MessageSquare, LayoutDashboard, FlaskConical, Activity } from "lucide-react";
import { SettingsPanel } from "@/components/settings-panel";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", icon: LayoutDashboard, key: "models" as const },
  { href: "/chat", icon: MessageSquare, key: "chat" as const },
  { href: "/tests", icon: FlaskConical, key: "tests" as const },
  { href: "/system", icon: Activity, key: "system" as const },
];

export function Navbar() {
  const pathname = usePathname();
  const { lang, setLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[rgba(34,42,53,0.08)] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-heading text-base font-semibold text-[#242424] tracking-tight">
          <Cpu className="h-5 w-5 text-[#242424]" />
          <span>{t.appName}</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 text-sm">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 transition-colors text-[#111111]",
                  isActive
                    ? "bg-[#f5f5f5] text-[#242424] font-semibold"
                    : "hover:bg-[#f5f5f5]/80 hover:text-[#242424]"
                )}
              >
                <item.icon className="h-4 w-4" />
                {t.nav[item.key]}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setLang(lang === "pl" ? "en" : "pl")}
          >
            {lang.toUpperCase()}
          </Button>
          <SettingsPanel />
        </div>
      </div>
    </header>
  );
}
