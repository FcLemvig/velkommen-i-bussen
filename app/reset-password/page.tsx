import Link from "next/link";
import { KeyRound } from "lucide-react";
import { resetPasswordAction } from "@/app/reset-password/actions";
import { FormMessage } from "@/components/FormMessage";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; error?: string; invalid?: string }>;
}) {
  const params = await searchParams;
  const resetToken = params.token
    ? await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashPasswordResetToken(params.token) },
        select: { expiresAt: true }
      })
    : null;
  const isValid = Boolean(resetToken && resetToken.expiresAt > new Date() && params.invalid !== "1");

  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 py-12">
      <div>
        <KeyRound className="mb-4 text-bus" size={34} />
        <h1 className="text-3xl font-extrabold text-ink">Vælg ny adgangskode</h1>
        <p className="mt-2 text-slate-600">Din nye adgangskode skal være på mindst 8 tegn.</p>
      </div>

      {isValid ? (
        <form action={resetPasswordAction} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
          <FormMessage message={params.error} />
          <input type="hidden" name="token" value={params.token} />
          <div className="grid gap-2">
            <label htmlFor="newPassword">Ny adgangskode</label>
            <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required autoFocus />
          </div>
          <div className="grid gap-2">
            <label htmlFor="confirmPassword">Gentag ny adgangskode</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <button type="submit" className="bg-bus text-white hover:bg-bus/90">
            Gem ny adgangskode
          </button>
        </form>
      ) : (
        <div className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Linket er ugyldigt eller udløbet. Bed om et nyt link for at fortsætte.
          </p>
          <Link href="/forgot-password" className="rounded-2xl bg-bus px-4 py-3 text-center font-bold text-white hover:bg-bus/90">
            Send et nyt link
          </Link>
        </div>
      )}
    </main>
  );
}
