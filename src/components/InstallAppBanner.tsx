"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Download, X, Share, PlusSquare, Sparkles, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  const handleInstallClick = useCallback(async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      alert("To install VarsMart: Tap your browser menu (⋮) and select 'Install app' or 'Add to Home screen'.");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowBanner(false);
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 5000);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn("PWA install error:", err);
    }
  }, [deferredPrompt, isIos]);

  useEffect(() => {
    // Check if already running as installed standalone PWA
    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (inStandalone) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // Check if dismissed recently (within 5 days)
    const dismissedAt = localStorage.getItem("varsmart_pwa_dismissed_at");
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    const isDismissed = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < fiveDaysMs;

    // Listen for Chromium PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Show for iOS if not dismissed
    if (isAppleDevice && !isDismissed) {
      const timer = setTimeout(() => setShowBanner(true), 2500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    // Listen for successful install
    const handleAppInstalled = () => {
      setShowBanner(false);
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Global listener for manual "Install App" triggers anywhere on the site
    const handleCustomTrigger = () => {
      if (isAppleDevice) {
        setShowIosModal(true);
      } else if (deferredPrompt) {
        void handleInstallClick();
      } else {
        setShowBanner(true);
      }
    };

    window.addEventListener("varsmart:install-prompt", handleCustomTrigger);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("varsmart:install-prompt", handleCustomTrigger);
    };
  }, [deferredPrompt, handleInstallClick]);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("varsmart_pwa_dismissed_at", Date.now().toString());
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Toast Notification When Installed Successfully */}
      {installedSuccess && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-xl animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          <span>VarsMart App installed to your phone successfully!</span>
        </div>
      )}

      {/* Floating Bottom Install Banner */}
      {showBanner && (
        <aside
          aria-label="Install VarsMart application"
          className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 rounded-3xl border border-blue-200/80 bg-white/95 backdrop-blur-xl p-4 shadow-2xl shadow-blue-900/15 transition-all animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex items-start gap-3">
            <div className="relative h-12 w-12 shrink-0 rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-blue-600 flex items-center justify-center">
              <Image
                src="/icon-192.png"
                alt="VarsMart App Icon"
                width={48}
                height={48}
                className="object-cover"
                priority
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-gray-900 truncate">Download VarsMart App</h4>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-700">
                  <Sparkles className="h-2.5 w-2.5 text-blue-600" /> Free
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500 leading-tight">
                Install on your phone for faster browsing and instant campus updates.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isIos ? "Install to iPhone" : "Download App"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition-all"
                  aria-label="Dismiss download prompt"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* iOS Installation Instruction Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl overflow-hidden shadow-sm">
                  <Image src="/icon-192.png" alt="VarsMart" width={36} height={36} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Install VarsMart on iOS</h3>
                  <p className="text-[10px] text-gray-400">Add to your iPhone Home Screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-gray-600">
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                  1
                </span>
                <p className="leading-snug">
                  Tap the <strong className="text-gray-900">Share</strong> button at the bottom of Safari (<Share className="inline h-3.5 w-3.5 text-blue-600" />).
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                  2
                </span>
                <p className="leading-snug">
                  Scroll down the options and select <strong className="text-gray-900">Add to Home Screen</strong> (<PlusSquare className="inline h-3.5 w-3.5 text-blue-600" />).
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                  3
                </span>
                <p className="leading-snug">
                  Tap <strong className="text-gray-900">Add</strong> in the top-right corner. The VarsMart app icon will appear on your phone!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="mt-5 w-full rounded-2xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
