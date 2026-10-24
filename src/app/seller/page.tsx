import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SellerDashboard from "@/components/SellerDashboard";

export const metadata: Metadata = {
  title: "Seller Portal | VarsMart",
};

export default function SellerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex flex-1 justify-center px-4 py-10 sm:px-6">
        <SellerDashboard />
      </main>
      <Footer />
    </div>
  );
}
