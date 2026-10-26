"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "varsmart_wishlist";

export function getSavedWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWishlist(items: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("varsmart:wishlist-updated", { detail: items }));
  } catch {
    // Ignore storage quota errors
  }
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setWishlist(getSavedWishlist());

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<string[]>;
      if (custom.detail) {
        setWishlist(custom.detail);
      } else {
        setWishlist(getSavedWishlist());
      }
    };

    window.addEventListener("varsmart:wishlist-updated", handleUpdate);
    return () => {
      window.removeEventListener("varsmart:wishlist-updated", handleUpdate);
    };
  }, []);

  const isWishlisted = useCallback(
    (id: string): boolean => {
      return wishlist.includes(id);
    },
    [wishlist]
  );

  const toggleWishlist = useCallback(
    (id: string) => {
      const current = getSavedWishlist();
      let updated: string[];
      if (current.includes(id)) {
        updated = current.filter((item) => item !== id);
      } else {
        updated = [id, ...current];
      }
      saveWishlist(updated);
      setWishlist(updated);
    },
    []
  );

  return {
    wishlist: isMounted ? wishlist : [],
    isWishlisted,
    toggleWishlist,
    wishlistCount: isMounted ? wishlist.length : 0,
    isMounted,
  };
}
