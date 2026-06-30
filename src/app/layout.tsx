import type { Metadata } from "next";
import "./globals.css";
import TopLoader from "@/components/TopLoader";

export const metadata: Metadata = {
  title: "Interview Scorecard",
  description: "Structured technical interview tool with live scoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#0d1117] text-[#e6edf3] antialiased">
        <TopLoader />
        <nav className="border-b border-[#21262d] bg-[#161b22] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
            <a href="/" className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-400">◈</span> Interview Scorecard
            </a>
            <div className="flex items-center gap-6 text-sm">
              <a href="/" className="text-[#8b949e] hover:text-white transition-colors">New Interview</a>
              <a href="/interviews" className="text-[#8b949e] hover:text-white transition-colors">History</a>
              <a href="/roles" className="text-[#8b949e] hover:text-white transition-colors">Manage Roles</a>
              <a href="/common-rounds" className="text-[#8b949e] hover:text-white transition-colors">Common Rounds</a>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
