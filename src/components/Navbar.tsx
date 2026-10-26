"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, UserRound, X, ShieldCheck, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUnreadMessages } from "@/lib/useUnreadMessages";
import { usePwaInstall } from "@/lib/usePwaInstall";
import Logo from "@/components/Logo";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/messages", label: "Messages" },
  { href: "/seller", label: "Sell on VarsMart" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();
  const { unreadCount, hasUnread } = useUnreadMessages();
  const { isMounted, isInstalled, isStandalone, device } = usePwaInstall();
  const showInstallButton = isMounted && !isInstalled && !isStandalone;

  useEffect(() => {
    if (!supabase) return;

    async function checkUser() {
      try {
        if (!supabase) return;
        const { data } = await supabase.auth.getUser();
        const signedIn = Boolean(data?.user);
        setIsLoggedIn(signedIn);
        if (signedIn) {
          const { data: adminRes } = await supabase.rpc("is_admin");
          setIsAdmin(Boolean(adminRes));
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    }

    void checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: unknown, session: { user: unknown } | null) => {
      try {
        const signedIn = Boolean(session?.user);
        setIsLoggedIn(signedIn);
        if (signedIn && supabase) {
          const { data: adminRes } = await supabase.rpc("is_admin");
          setIsAdmin(Boolean(adminRes));
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-50 glass-nav">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center" aria-label="VarsMart home">
          <Logo size="md" />
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={`relative rounded-xl px-3.5 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === link.href
                  ? "bg-blue-50 font-bold text-blue-700"
                  : "text-gray-600 hover:bg-white/70 hover:text-blue-700"
              }`}
            >
              <span>{link.label}</span>
              {link.href === "/messages" && hasUnread && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                pathname === "/admin"
                  ? "bg-purple-100 font-bold text-purple-800"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100/80"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
          {showInstallButton && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("varsmart:install-prompt"))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-100/80 active:scale-95 transition-all"
              title={device.title}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{device.installActionLabel}</span>
            </button>
          )}

          <Link
            href={isLoggedIn ? "/account" : "/login"}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
              isLoggedIn
                ? "bg-blue-50 text-blue-700 hover:bg-blue-100/70"
                : "text-blue-700 hover:bg-blue-50"
            }`}
          >
            <UserRound className="h-4 w-4" />
            {isLoggedIn ? "My Account" : "Sign In"}
          </Link>
        </div>

        <button
          type="button"
          className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          {!mobileOpen && hasUnread && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="glass-panel space-y-1 rounded-2xl border border-white/70 p-3 shadow-xl md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                pathname === link.href
                  ? "bg-blue-50 font-bold text-blue-700"
                  : "text-gray-700 hover:bg-white/70 hover:text-blue-700"
              }`}
            >
              <span>{link.label}</span>
              {link.href === "/messages" && hasUnread && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold ${
                pathname === "/admin"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Hub
            </Link>
          )}
          <Link
            href={isLoggedIn ? "/account" : "/login"}
            aria-current={pathname === (isLoggedIn ? "/account" : "/login") ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
            className={`block rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
              pathname === (isLoggedIn ? "/account" : "/login")
                ? "bg-blue-50 font-bold text-blue-700"
                : "text-blue-700 hover:bg-white/70"
            }`}
          >
            {isLoggedIn ? "My Account" : "Sign In"}
          </Link>

          {showInstallButton && (
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  window.dispatchEvent(new CustomEvent("varsmart:install-prompt"));
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Download className="h-4 w-4" />
                <span>{device.installActionLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
