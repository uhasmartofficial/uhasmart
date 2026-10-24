"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  const checkMessages = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setUnreadCount(0);
        return;
      }

      // Fetch inquiry IDs where the user is either buyer or seller
      const { data: inquiries } = await supabase
        .from("inquiries")
        .select("id")
        .or(`buyer_id.eq.${authData.user.id},seller_id.eq.${authData.user.id}`);

      if (!inquiries || inquiries.length === 0) {
        setUnreadCount(0);
        return;
      }

      const inquiryIds = (inquiries as { id: string }[]).map((i) => i.id);

      // Check recent incoming messages not authored by current user
      const { data: incomingMsgs } = await supabase
        .from("inquiry_messages")
        .select("id,created_at,sender_id")
        .in("inquiry_id", inquiryIds)
        .neq("sender_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (incomingMsgs && incomingMsgs.length > 0) {
        let lastViewed: string | null = null;
        try {
          lastViewed =
            typeof window !== "undefined"
              ? localStorage.getItem("varsmart_messages_last_read") || localStorage.getItem("uhasmart_messages_last_read")
              : null;
        } catch {
          lastViewed = null;
        }

        const lastViewedTime = lastViewed ? new Date(lastViewed).getTime() : 0;
        const freshUnread = (incomingMsgs as { created_at: string }[]).filter(
          (m) => new Date(m.created_at).getTime() > lastViewedTime
        );
        setUnreadCount(freshUnread.length);
      } else {
        setUnreadCount(0);
      }
    } catch {
      // Graceful fallback: never crash UI
    }
  }, [supabase]);

  useEffect(() => {
    void checkMessages();

    if (!supabase) return;

    // Listen to local storage events if multiple tabs are open
    const handleStorage = () => void checkMessages();
    window.addEventListener("storage", handleStorage);

    // Each hook instance uses a unique channel name to prevent "cannot add callbacks after subscribe()" error
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelId = `unread_badge_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "inquiry_messages",
          },
          () => {
            void checkMessages();
          }
        )
        .subscribe();
    } catch {
      // Gracefully ignore subscription errors
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (channel && supabase) {
        try {
          void supabase.removeChannel(channel);
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [supabase, checkMessages]);

  const markAllRead = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("varsmart_messages_last_read", new Date().toISOString());
        setUnreadCount(0);
      }
    } catch {
      setUnreadCount(0);
    }
  }, []);

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    markAllRead,
    refreshUnread: checkMessages,
  };
}
