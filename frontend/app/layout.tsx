import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "CivicFix 311 | Official Municipal Service & Resolution System",
  description: "Report non-emergency municipal issues, track resolution status, and view city infrastructure services in real-time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        <AuthProvider>
          <Navbar />
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
