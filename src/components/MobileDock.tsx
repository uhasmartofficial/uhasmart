"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Plus, MessageSquare, User, Heart } from "lucide-react";
import { useUnreadMessages } from "@/lib/useUnreadMessages";
import { useWishlist } from "@/lib/useWishlist";

export default function MobileDock() {
  const pathname = usePathname();
  const { unreadCount, hasUnread } = useUnreadMessages();
  const { wishlistCount } = useWishlist();

  const links = [
    { href: "/", label: "Market", icon: Search },
    { href: "/?filter=saved", label: "Saved", icon: Heart, badge: wishlistCount > 0 ? wishlistCount : null },
    { href: "/seller", label: "Sell", icon: Plus, isAction: true },
    {
      href: "/messages",
      label: "Chats",
      icon: MessageSquare,
      badge: hasUnread ? (unreadCount > 9 ? "9+" : unreadCount) : null,
      isAlert: true,
    },
    { href: "/account", label: "Account", icon: User },
  ];

  return (
    <nav
      aria-label="Mobile Dock"
      className="fixed bottom-4 left-3 right-3 z-40 mx-auto max-w-sm glass-ios rounded-full px-3 py-2 shadow-xl md:hidden transition-colors"
    >
      <div className="flex items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href || (link.href === "/account" && pathname === "/login");

          if (link.isAction) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative -mt-5 flex flex-col items-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-transform active:scale-95">
                  <Plus className="h-6 w-6 stroke-[2.5]" />
                </div>
                <span className="mt-1 text-[10px] font-bold text-gray-700 dark:text-slate-200">
                  Sell
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex flex-col items-center py-1 transition-all active:scale-95 ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                {link.badge !== null && link.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-white shadow-sm ${
                      link.isAlert ? "bg-rose-500 animate-pulse" : "bg-rose-500"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 text-[10px]">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
