import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createOrganizationAction } from "@/app/dashboard/admin/organizations/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";

export default async function NewOrganizationPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const params = await searchParams;

  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Ny forening eller institution</h1>
        <p className="mt-2 text-slate-600">Opret profil, kontaktoplysninger og medlemsstatus.</p>
      </div>

      <form action={createOrganizationAction} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
        <FormMessage message={params.error} />
        <div className="grid gap-2">
          <label htmlFor="name">Navn på forening/institution</label>
          <input id="name" name="name" autoComplete="organization" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="phone">Telefon</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" required />
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="address">Adresse</label>
          <input id="address" name="address" autoComplete="street-address" required />
        </div>
        <div className="grid gap-2">
          <label htmlFor="membershipStatus">Medlemsstatus</label>
          <select id="membershipStatus" name="membershipStatus" defaultValue="PENDING_PAYMENT">
            <option value="PENDING_PAYMENT">Afventer betaling</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="PAUSED">Pause</option>
            <option value="ENDED">Afsluttet</option>
          </select>
        </div>
        <div className="rounded-2xl border border-fjord/25 bg-fjord/10 px-4 py-3 text-sm text-slate-700">
          Foreningen modtager en velkomstmail med et sikkert link til selv at vælge adgangskode.
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="bg-bus text-white hover:bg-bus/90">Opret forening</button>
          <Link href="/dashboard/admin/organizations" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
            <ArrowLeft size={16} /> Tilbage
          </Link>
        </div>
      </form>
    </main>
  );
}
