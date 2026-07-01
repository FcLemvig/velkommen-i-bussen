import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import "./globals.css";
import { clearSession, getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Velkommen i Bussen",
  description: "Frivillig bustjeneste for borgere i lokalomraadet"
};

async function logoutAction() {
  "use server";
  await clearSession();
  redirect("/");
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="da">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white/95">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-3" aria-label="Velkommen i Bussen">
              <img src="/velkommen-i-bussen-logo.png" alt="Velkommen i Bussen" className="h-14 w-14 rounded-full" />
              <span className="hidden text-lg font-bold text-ink sm:inline">Velkommen i Bussen</span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <Link href="/dashboard" className="text-slate-700 hover:text-ink">
                    Dashboard
                  </Link>
                  <form action={logoutAction}>
                    <button className="gap-2 bg-slate-900 text-white hover:bg-slate-700" type="submit">
                      <LogOut size={16} />
                      Log ud
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-slate-700 hover:text-ink">
                    Log ind
                  </Link>
                  <Link href="/register" className="button bg-fjord text-white hover:bg-fjord/90">
                    Opret profil
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
