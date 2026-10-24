import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RegisterBusinessView from "@/components/RegisterBusinessView";

export const metadata: Metadata = {
  title: "Register Business | VarsMart",
};

export default function RegisterBusinessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <RegisterBusinessView />
      </main>
      <Footer />
    </div>
  );
}
