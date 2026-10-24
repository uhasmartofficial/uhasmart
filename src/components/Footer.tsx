import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Link href="/" className="group flex items-center">
            <Logo size="sm" />
          </Link>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <Link href="/marketplace" className="hover:text-blue-600">Marketplace</Link>
            <Link href="/register-business" className="hover:text-blue-600">Register Business</Link>
            <Link href="/login" className="hover:text-blue-600">My Account</Link>
          </div>

          <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>Trusted student commerce platform &bull; Ho, Ghana</span>
          </p>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} VarsMart. The trusted campus student marketplace.
        </div>
      </div>
    </footer>
  );
}
