import Link from "next/link";
import { registerAction } from "@/app/register/actions";
import { FormMessage } from "@/components/FormMessage";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 py-12">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Opret profil</h1>
        <p className="mt-2 text-slate-600">Når profilen er oprettet, kan du anmode om kørsel med det samme.</p>
      </div>
      <form action={registerAction} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
        <FormMessage message={params.error} />
        <div className="grid gap-2">
          <label htmlFor="name">Navn</label>
          <input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="grid gap-2">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-2">
          <label htmlFor="phone">Telefonnummer</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required />
        </div>
        <div className="grid gap-2">
          <label htmlFor="password">Adgangskode</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <button type="submit" className="bg-bus text-white hover:bg-bus/90">
          Opret profil
        </button>
      </form>
      <p className="text-sm text-slate-600">
        Har du allerede en profil?{" "}
        <Link href="/login" className="font-bold text-ink hover:text-bus">
          Log ind
        </Link>
      </p>
    </main>
  );
}
