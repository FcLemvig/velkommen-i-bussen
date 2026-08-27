import Link from "next/link";
import { ArrowLeft, CalendarPlus, Info } from "lucide-react";
import { createAdminRideAction } from "@/app/dashboard/admin/rides/new/actions";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewAdminRidePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const params = await searchParams;
  const citizens = await prisma.citizenProfile.findMany({
    orderBy: { user: { name: "asc" } },
    include: { user: { include: { membership: true } } }
  });

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-5 md:py-8">
      <div>
        <Link href="/dashboard/admin" className="inline-flex items-center gap-2 text-sm font-bold text-ink hover:text-bus">
          <ArrowLeft size={17} />
          Tilbage til administration
        </Link>
      </div>

      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <p className="text-sm font-bold uppercase text-white/75">Administration</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Opret tur for en borger</h1>
        <p className="mt-3 text-sm leading-6 text-white/85">
          Appen finder en ledig bus og opretter automatisk en vagt fra 30 minutter før turen og to timer frem.
        </p>
      </section>

      <section className="rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm md:p-6">
        <form action={createAdminRideAction} className="grid gap-5">
          <FormMessage message={params.error} />

          <div className="grid gap-2">
            <label htmlFor="citizenProfileId">Borger</label>
            <select id="citizenProfileId" name="citizenProfileId" required defaultValue="">
              <option value="" disabled>Vælg borger</option>
              {citizens.map((citizen) => (
                <option key={citizen.id} value={citizen.id}>
                  {citizen.user.name} - {citizen.user.email}{citizen.address ? ` - ${citizen.address}` : ""}
                </option>
              ))}
            </select>
            {citizens.length === 0 ? (
              <p className="text-sm font-semibold text-red-700">Der er endnu ingen borgere at oprette en tur for.</p>
            ) : null}
          </div>

          <AddressAutocompleteInput id="pickupAddress" name="pickupAddress" label="Afhentningsadresse" required />
          <AddressAutocompleteInput id="destinationAddress" name="destinationAddress" label="Destinationsadresse" required />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="date">Dato</label>
              <input id="date" name="date" type="date" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="time">Afgangstidspunkt</label>
              <input id="time" name="time" type="time" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="passengers">Antal passagerer</label>
              <input id="passengers" name="passengers" type="number" min="1" max="6" defaultValue="1" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="purpose">Formål</label>
              <input id="purpose" name="purpose" placeholder="Fx skole, læge eller aktivitet" required />
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border-2 border-fjord/30 bg-cream p-4">
            <label className="flex items-start gap-3">
              <input className="mt-1 h-4 w-4" type="checkbox" name="includesMinors" />
              <span>
                Turen gælder børn eller unge
                <span className="block text-xs font-normal text-slate-600">Forælder eller værge skal have godkendt kørslen.</span>
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="guardianName">Forælder/værge</label>
                <input id="guardianName" name="guardianName" placeholder="Navn" />
              </div>
              <div className="grid gap-2">
                <label htmlFor="guardianPhone">Telefon til forælder/værge</label>
                <input id="guardianPhone" name="guardianPhone" type="tel" inputMode="tel" />
              </div>
            </div>
            <label className="flex items-start gap-3">
              <input className="mt-1 h-4 w-4" type="checkbox" name="parentalConsent" />
              <span>Forælder/værge har godkendt kørslen</span>
            </label>
          </div>

          <div className="grid gap-2">
            <label htmlFor="notes">Noter til chaufføren</label>
            <textarea id="notes" name="notes" rows={4} placeholder="Fx hvor borgeren skal mødes, hjælpemidler eller andre praktiske oplysninger." />
          </div>

          <div className="flex gap-3 rounded-2xl border border-fjord/25 bg-fjord/10 px-4 py-3 text-sm text-ink">
            <Info className="mt-0.5 shrink-0 text-bus" size={18} />
            <p>Hvis begge busser er optaget, bliver turen stadig oprettet. Du får tydelig besked om, at vagten skal planlægges manuelt.</p>
          </div>

          <button type="submit" disabled={citizens.length === 0} className="h-14 gap-2 bg-bus text-base text-white hover:bg-bus/90 disabled:cursor-not-allowed disabled:opacity-50">
            <CalendarPlus size={19} />
            Opret tur og vagt
          </button>
        </form>
      </section>
    </main>
  );
}
