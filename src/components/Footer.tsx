"use client";

import Link from "next/link";
import { ShieldCheck, Download } from "lucide-react";
import Logo from "@/components/Logo";
import { usePwaInstall } from "@/lib/usePwaInstall";

export default function Footer() {
  const { isMounted, isInstalled, isStandalone, device } = usePwaInstall();
  const showInstallButton = isMounted && !isInstalled && !isStandalone;

  return (
    <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Link href="/" className="group flex items-center">
            <Logo size="sm" />
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Home
            </Link>
            <Link href="/marketplace" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Marketplace
            </Link>
            <Link href="/marketplace?filter=saved" className="hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
              Saved Items
            </Link>
            <Link href="/register-business" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Register Business
            </Link>
            <Link href="/login" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              My Account
            </Link>
            {showInstallButton && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("varsmart:install-prompt"))}
                className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline"
                title={device.title}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{device.installActionLabel}</span>
              </button>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Trusted student commerce platform &bull; Ho, Ghana</span>
          </p>
        </div>

        <div className="mt-8 border-t border-gray-100 dark:border-slate-800 pt-6 text-center text-xs text-gray-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} VarsMart. The trusted campus student marketplace.
        </div>
      </div>
    </footer>
  );
}
