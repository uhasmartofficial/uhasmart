import type { Metadata, Viewport } from "next";
import MobileDock from "@/components/MobileDock";
import PwaRegister from "@/components/PwaRegister";
import InstallAppBanner from "@/components/InstallAppBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "VarsMart | Campus Student Marketplace",
  description: "The trusted campus marketplace for students. Buy, sell, and discover student products, hostels, fashion, food, and campus services.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VarsMart",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/icon-192.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-700">
        {/* Background Ambient iOS Glows (Non-blocking, behind content) */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="ambient-glow-blue absolute -left-20 -top-20 h-96 w-96 rounded-full blur-3xl" />
          <div className="ambient-glow-purple absolute -right-20 top-1/3 h-[28rem] w-[28rem] rounded-full blur-3xl" />
        </div>

        <div className="relative flex min-h-screen flex-col pb-28 md:pb-0">
          {children}
        </div>

        {/* Floating iOS Frosted Glass Mobile Dock */}
        <MobileDock />

        {/* PWA Service Worker & Install Prompt Banner */}
        <PwaRegister />
        <InstallAppBanner />
      </body>
    </html>
  );
}
