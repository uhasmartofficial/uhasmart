import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AccountHub from "@/components/AccountHub";

export const metadata: Metadata = {
  title: "My Account | VarsMart",
  description: "Manage your VarsMart student account, profile, campus shop, and security settings.",
};

export default function AccountPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-3 py-6 sm:px-6 sm:py-12">
        <AccountHub />
      </main>
      <Footer />
    </div>
  );
}
