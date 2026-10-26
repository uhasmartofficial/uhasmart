"use client";

import { useEffect, useState, useCallback } from "react";

export type DeviceType = "windows" | "mac" | "android" | "ios" | "linux" | "other";

export interface DeviceInfo {
  type: DeviceType;
  isMobile: boolean;
  isDesktop: boolean;
  isIos: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isMac: boolean;
  deviceLabel: string;
  installActionLabel: string;
  title: string;
  description: string;
  successToast: string;
  desktopGuide: {
    browserName: string;
    steps: string[];
  };
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global cached prompt so components can share the prompt event across re-renders
declare global {
  interface Window {
    __varsmart_pwa_prompt?: BeforeInstallPromptEvent | null;
  }
}

export function detectDevice(): DeviceInfo {
  if (typeof window === "undefined" || !window.navigator) {
    return {
      type: "other",
      isMobile: false,
      isDesktop: true,
      isIos: false,
      isAndroid: false,
      isWindows: false,
      isMac: false,
      deviceLabel: "Device",
      installActionLabel: "Install App",
      title: "Download VarsMart App",
      description: "Install VarsMart for fast access and campus marketplace updates.",
      successToast: "VarsMart App installed successfully!",
      desktopGuide: {
        browserName: "Browser",
        steps: ["Click the install icon in your address bar", "Confirm installation"],
      },
    };
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const platform = (
    (window.navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    window.navigator.platform ||
    ""
  ).toLowerCase();

  const isIos =
    /iphone|ipad|ipod/.test(ua) ||
    (platform.includes("mac") && (window.navigator.maxTouchPoints || 0) > 1);
  const isAndroid = /android/.test(ua);
  const isWindows = /windows nt|win32|win64/.test(ua) || platform.includes("win");
  const isMac = !isIos && (/macintosh|mac os x/.test(ua) || platform.includes("mac"));
  const isLinux = !isAndroid && (/linux|x11/.test(ua) || platform.includes("linux"));

  const isMobile = isIos || isAndroid || /mobile/.test(ua);
  const isDesktop = !isMobile;

  const isEdge = /edg\//.test(ua);
  const isChrome = /chrome|crios/.test(ua) && !isEdge;
  const isSafari = /safari/.test(ua) && !isChrome && !isEdge;

  if (isIos) {
    return {
      type: "ios",
      isMobile: true,
      isDesktop: false,
      isIos: true,
      isAndroid: false,
      isWindows: false,
      isMac: false,
      deviceLabel: "iPhone / iPad",
      installActionLabel: "Install to iPhone",
      title: "Install VarsMart for iOS",
      description: "Add VarsMart to your Home Screen for full-screen campus shopping and instant alerts.",
      successToast: "VarsMart App added to your Home Screen!",
      desktopGuide: {
        browserName: "Safari iOS",
        steps: [
          "Tap the Share button at the bottom of Safari",
          "Select 'Add to Home Screen'",
          "Tap 'Add' in the top right corner",
        ],
      },
    };
  }

  if (isAndroid) {
    return {
      type: "android",
      isMobile: true,
      isDesktop: false,
      isIos: false,
      isAndroid: true,
      isWindows: false,
      isMac: false,
      deviceLabel: "Android Phone",
      installActionLabel: "Install on Android",
      title: "Download VarsMart App",
      description: "Install to your Android phone for 1-tap campus shopping and offline access.",
      successToast: "VarsMart App installed on your Android phone!",
      desktopGuide: {
        browserName: "Chrome for Android",
        steps: ["Tap 'Install App' or browser menu (⋮)", "Select 'Install app' or 'Add to Home screen'"],
      },
    };
  }

  if (isWindows) {
    const browser = isEdge ? "Microsoft Edge" : isChrome ? "Google Chrome" : "Browser";
    return {
      type: "windows",
      isMobile: false,
      isDesktop: true,
      isIos: false,
      isAndroid: false,
      isWindows: true,
      isMac: false,
      deviceLabel: "Windows PC",
      installActionLabel: "Install on PC",
      title: "Install VarsMart for Windows",
      description: "Install our desktop app to your PC for 1-click access right from your taskbar or desktop.",
      successToast: "VarsMart Desktop App installed to your PC!",
      desktopGuide: {
        browserName: browser,
        steps: [
          "Look at the right end of your URL address bar above.",
          "Click the 'Install app' icon (computer screen with a down arrow).",
          "Click 'Install' to add VarsMart directly to your Windows desktop and taskbar.",
        ],
      },
    };
  }

  if (isMac) {
    const browser = isSafari ? "Safari" : isChrome ? "Google Chrome" : isEdge ? "Microsoft Edge" : "Mac Browser";
    return {
      type: "mac",
      isMobile: false,
      isDesktop: true,
      isIos: false,
      isAndroid: false,
      isWindows: false,
      isMac: true,
      deviceLabel: "Mac",
      installActionLabel: "Install on Mac",
      title: "Install VarsMart for Mac",
      description: "Install our desktop app to your Mac Dock & Launchpad for instant campus browsing.",
      successToast: "VarsMart App installed to your Mac Dock!",
      desktopGuide: {
        browserName: browser,
        steps: isSafari
          ? [
              "Click 'File' in the Mac menu bar at the top of your screen.",
              "Select 'Add to Dock...'",
              "Click 'Add' to launch VarsMart directly from your Mac Dock.",
            ]
          : [
              "Look at the right end of your URL address bar above.",
              "Click the 'Install' icon (desktop screen with down arrow).",
              "Click 'Install' to add VarsMart to your Mac Applications & Dock.",
            ],
      },
    };
  }

  return {
    type: isLinux ? "linux" : "other",
    isMobile,
    isDesktop,
    isIos: false,
    isAndroid: false,
    isWindows: false,
    isMac: false,
    deviceLabel: isMobile ? "Mobile Device" : "Computer / Laptop",
    installActionLabel: isMobile ? "Download App" : "Install Desktop App",
    title: isMobile ? "Download VarsMart App" : "Install VarsMart for Desktop",
    description: isMobile
      ? "Install VarsMart for faster access and offline campus marketplace shopping."
      : "Install our desktop app for instant 1-click access right from your computer.",
    successToast: "VarsMart App installed successfully!",
    desktopGuide: {
      browserName: "Browser",
      steps: [
        "Click the Install button or icon in your browser address bar",
        "Confirm installation to add VarsMart to your system",
      ],
    },
  };
}

export function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    (typeof document !== "undefined" && document.referrer.includes("android-app://"))
  );
}

export function checkIsInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if (checkIsStandalone()) return true;
  try {
    return localStorage.getItem("varsmart_pwa_installed") === "true";
  } catch {
    return false;
  }
}

export function markAppInstalled(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("varsmart_pwa_installed", "true");
  } catch {
    // Ignore storage errors in private browsing
  }
  window.dispatchEvent(new CustomEvent("varsmart:pwa-installed"));
}

export function usePwaInstall() {
  const [isMounted, setIsMounted] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [device, setDevice] = useState<DeviceInfo>(() => detectDevice());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const syncInstallState = useCallback(() => {
    const standalone = checkIsStandalone();
    const installed = checkIsInstalled();
    setIsStandalone(standalone);
    setIsInstalled(installed);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    setDevice(detectDevice());
    syncInstallState();

    // Check if prompt was previously caught on window
    if (typeof window !== "undefined" && window.__varsmart_pwa_prompt) {
      setDeferredPrompt(window.__varsmart_pwa_prompt);
    }

    const onInstalledGlobal = () => {
      setIsInstalled(true);
    };

    const onAppInstalled = () => {
      markAppInstalled();
      setDeferredPrompt(null);
      if (typeof window !== "undefined") {
        window.__varsmart_pwa_prompt = null;
      }
    };

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const p = e as BeforeInstallPromptEvent;
      if (typeof window !== "undefined") {
        window.__varsmart_pwa_prompt = p;
      }
      setDeferredPrompt(p);
    };

    window.addEventListener("varsmart:pwa-installed", onInstalledGlobal);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    let mediaQuery: MediaQueryList | null = null;
    const onMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsInstalled(true);
        markAppInstalled();
      }
    };

    try {
      mediaQuery = window.matchMedia("(display-mode: standalone)");
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", onMediaChange);
      }
    } catch {
      // Ignore unsupported browsers
    }

    return () => {
      window.removeEventListener("varsmart:pwa-installed", onInstalledGlobal);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      if (mediaQuery && mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", onMediaChange);
      }
    };
  }, [syncInstallState]);

  return {
    isMounted,
    isInstalled: isMounted ? isInstalled : false,
    isStandalone: isMounted ? isStandalone : false,
    device,
    deferredPrompt,
    setDeferredPrompt,
  };
}
