import Link from "next/link";
import { registerAction } from "@/app/register/actions";
import { FormMessage } from "@/components/FormMessage";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="mx-auto grid max-w-xl gap-6 px-4 py-12">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Opret profil</h1>
        <p className="mt-2 text-slate-600">Opret dig som borger eller som forening/institution.</p>
      </div>
      <form action={registerAction} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
        <FormMessage message={params.error} />
        <fieldset className="grid gap-3">
          <legend className="text-sm font-bold text-ink">Profiltype</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-2xl border border-fjord/30 bg-cream p-4">
              <input className="mt-1 h-4 w-4" type="radio" name="accountType" value="CITIZEN" defaultChecked />
              <span>
                Borger
                <span className="block text-xs font-normal text-slate-600">Til private kørselsanmodninger.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-fjord/30 bg-cream p-4">
              <input className="mt-1 h-4 w-4" type="radio" name="accountType" value="ORGANIZATION" />
              <span>
                Forening/institution
                <span className="block text-xs font-normal text-slate-600">Til booking af bus og frivillig chauffør.</span>
              </span>
            </label>
          </div>
        </fieldset>
        <div className="grid gap-2">
          <label htmlFor="name">Navn</label>
          <input id="name" name="name" autoComplete="name" placeholder="Navn eller forening/institution" required />
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
          <label htmlFor="address">Adresse</label>
          <input id="address" name="address" autoComplete="street-address" placeholder="Påkrævet for forening/institution" />
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
