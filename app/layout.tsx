import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import "./globals.css";
import { clearSession, getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Velkommen i Bussen",
  description: "Lokal transport og fællesskab i Sydlemvig.",
  applicationName: "Velkommen i Bussen",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Velkommen i Bussen"
  },
  icons: {
    icon: [
      { url: "/velkommen-i-bussen-logo.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/velkommen-i-bussen-logo.png", sizes: "512x512", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#f5861f",
  colorScheme: "light"
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
        <header className="border-b border-bus/20 bg-white/95 shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-3" aria-label="Velkommen i Bussen">
              <img src="/velkommen-i-bussen-logo.png" alt="Velkommen i Bussen" className="h-14 w-14 rounded-full" />
              <span className="hidden text-lg font-extrabold text-ink sm:inline">Velkommen i Bussen</span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <Link href="/dashboard" className="font-semibold text-ink hover:text-bus">
                    Dashboard
                  </Link>
                  <form action={logoutAction}>
                    <button className="gap-2 bg-ink text-white hover:bg-brown" type="submit">
                      <LogOut size={16} />
                      Log ud
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="font-semibold text-ink hover:text-bus">
                    Log ind
                  </Link>
                  <Link href="/register" className="button bg-bus text-white hover:bg-bus/90">
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
