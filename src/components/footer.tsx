"use client";

import { useI18n } from "@/lib/i18n-context";
import Link from "next/link";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-[rgba(34,42,53,0.08)] bg-white py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 text-xs text-[#898989]">
        <span>Ollama Manager</span>
        <div className="flex items-center gap-3">
          <Link href="/changelog" className="hover:text-[#242424] hover:underline">
            {t.footer.changelog}
          </Link>
          <span>
            {t.footer.version} 1.2.1
          </span>
        </div>
      </div>
    </footer>
  );
}
