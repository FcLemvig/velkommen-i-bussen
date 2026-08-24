import Link from "next/link";
import { KeyRound } from "lucide-react";
import { forgotPasswordAction } from "@/app/forgot-password/actions";
import { FormMessage } from "@/components/FormMessage";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 py-12">
      <div>
        <KeyRound className="mb-4 text-bus" size={34} />
        <h1 className="text-3xl font-extrabold text-ink">Glemt adgangskode</h1>
        <p className="mt-2 text-slate-600">Skriv den email, du bruger til Velkommen i Bussen.</p>
      </div>

      {params.sent === "1" ? (
        <div className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
          <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
            Hvis emailen findes, har vi sendt et link til at vælge en ny adgangskode. Tjek også mappen med uønsket mail.
          </p>
          <Link href="/login" className="text-center font-bold text-ink hover:text-bus">
            Tilbage til login
          </Link>
        </div>
      ) : (
        <form action={forgotPasswordAction} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
          <FormMessage message={params.error} />
          <div className="grid gap-2">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </div>
          <button type="submit" className="bg-bus text-white hover:bg-bus/90">
            Send link
          </button>
          <Link href="/login" className="text-center text-sm font-bold text-ink hover:text-bus">
            Tilbage til login
          </Link>
        </form>
      )}
    </main>
  );
}
