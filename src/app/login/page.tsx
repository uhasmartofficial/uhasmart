import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AccountView from "@/components/AccountView";

export const metadata: Metadata = {
  title: "Login | VarsMart",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <AccountView mode="login" />
      </main>
      <Footer />
    </div>
  );
}
