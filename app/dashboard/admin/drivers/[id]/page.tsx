import Link from "next/link";
import { notFound } from "next/navigation";
import { addCitizenAccessAction, updateDriverAction } from "@/app/dashboard/admin/drivers/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditDriverPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const driver = await prisma.driverProfile.findUnique({
    where: { id },
    include: { user: { include: { citizenProfile: true, membership: true } } }
  });

  if (!driver) {
    notFound();
  }

  const action = updateDriverAction.bind(null, driver.id);

  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Rediger chauffør</h1>
        <p className="mt-2 text-slate-600">Opdater kontaktoplysninger og om chaufføren er aktiv.</p>
      </div>
      <form action={action} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
        <FormMessage message={query.error || query.success} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="name">Navn</label>
            <input id="name" name="name" defaultValue={driver.user.name} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={driver.user.email} required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="phone">Telefon</label>
            <input id="phone" name="phone" defaultValue={driver.phone ?? ""} />
          </div>
          <div className="grid gap-2">
            <label htmlFor="licenseNumber">Kørekortnummer</label>
            <input id="licenseNumber" name="licenseNumber" defaultValue={driver.licenseNumber ?? ""} />
          </div>
        </div>
        <div className="grid gap-3">
          <label htmlFor="image">Profilbillede</label>
          {driver.imageUrl ? (
            <img src={driver.imageUrl} alt={driver.user.name} className="h-20 w-20 rounded-full object-cover" />
          ) : null}
          <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" />
          <p className="text-xs text-slate-500">Upload et nyt billede for at erstatte det nuværende.</p>
        </div>
        <div className="grid gap-2">
          <label htmlFor="notes">Noter</label>
          <textarea id="notes" name="notes" rows={4} defaultValue={driver.notes ?? ""} />
        </div>
        <div className="grid gap-2 rounded-2xl bg-cream p-4">
          <label htmlFor="password">Ny midlertidig adgangskode</label>
          <input id="password" name="password" type="password" minLength={8} autoComplete="new-password" />
          <p className="text-xs text-slate-600">
            Udfyld kun feltet, hvis chauff&oslash;ren skal have nulstillet sin adgangskode. Chauff&oslash;ren kan selv skifte den bagefter under Profil.
          </p>
        </div>
        <label className="flex items-center gap-2">
          <input className="h-4 w-4" type="checkbox" name="isActive" defaultChecked={driver.isActive} />
          Aktiv chauffør
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="bg-bus text-white hover:bg-bus/90">
            Gem ændringer
          </button>
          <Link href="/dashboard/admin/drivers" className="button border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
            Tilbage
          </Link>
        </div>
      </form>

      {driver.user.citizenProfile ? (
        <section className="rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-ink">Borger og chauffør</h2>
          <p className="mt-2 text-sm text-slate-600">Denne bruger har allerede adgang til både borger- og chaufførdelen med samme login.</p>
        </section>
      ) : (
        <form action={addCitizenAccessAction.bind(null, driver.id)} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-ink">Tilføj borgermedlemskab</h2>
            <p className="mt-2 text-sm text-slate-600">Giver chaufføren borgeradgang med samme email og adgangskode. Medlemskabet starter med at afvente betaling.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="citizenPhone">Telefon</label>
              <input id="citizenPhone" name="citizenPhone" type="tel" defaultValue={driver.phone ?? ""} required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="membershipType">Medlemskab</label>
              <select id="membershipType" name="membershipType" defaultValue="INDIVIDUAL">
                <option value="INDIVIDUAL">Borger</option>
                <option value="FAMILY">Familie</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="citizenAddress">Adresse</label>
            <input id="citizenAddress" name="citizenAddress" autoComplete="street-address" required />
          </div>
          <button type="submit" className="w-full bg-bus text-white hover:bg-bus/90 sm:w-fit">Tilføj borgermedlemskab</button>
        </form>
      )}
    </main>
  );
}
