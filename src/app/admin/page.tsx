import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminDashboard from "@/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin & Moderation | VarsMart",
};

export default function AdminPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex flex-1 justify-center px-4 py-10 sm:px-6">
        <AdminDashboard />
      </main>
      <Footer />
    </div>
  );
}
