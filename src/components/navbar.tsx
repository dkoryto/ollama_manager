"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Cpu, MessageSquare, LayoutDashboard, FlaskConical, Activity } from "lucide-react";
import { SettingsPanel } from "@/components/settings-panel";
import { ModeToggle } from "@/components/mode-toggle";

const navItems = [
  { href: "/", label: "Modele", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/tests", label: "Testy", icon: FlaskConical },
  { href: "/system", label: "System", icon: Activity },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Cpu className="h-5 w-5 text-primary" />
          <span>Ollama Manager</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 text-sm">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <SettingsPanel />
        </div>
      </div>
    </header>
  );
}
