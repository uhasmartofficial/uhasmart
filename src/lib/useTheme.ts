"use client";

import { useState, useEffect, useCallback } from "react";

const THEME_KEY = "varsmart_theme";

export function useTheme() {
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) {
        const dark = saved === "dark";
        setIsDark(dark);
        document.documentElement.classList.toggle("dark", dark);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDark(prefersDark);
        document.documentElement.classList.toggle("dark", prefersDark);
      }
    } catch {
      // Ignore storage errors
    }

    const handleSystemChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(THEME_KEY);
      if (!saved) {
        setIsDark(e.matches);
        document.documentElement.classList.toggle("dark", e.matches);
      }
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleSystemChange);
      }
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {
        // Ignore
      }
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  return {
    isDark: isMounted ? isDark : false,
    toggleTheme,
    isMounted,
  };
}
