import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { updateAdminRideAction } from "@/app/dashboard/admin/rides/[id]/actions";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { busLabels, busOptions } from "@/lib/shifts";

export default async function EditAdminRidePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const ride = await prisma.rideRequest.findUnique({
    where: { id },
    include: {
      citizenProfile: { include: { user: true } },
      automaticShift: true,
      sharedEvent: { include: { signups: true } }
    }
  });

  if (!ride) notFound();

  const action = updateAdminRideAction.bind(null, ride.id);
  const reservedSeats = ride.sharedEvent?.signups.reduce((sum, signup) => sum + signup.passengers, 0) ?? 0;

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 pb-24 pt-5 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-bus">Administration</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink">Rediger tur</h1>
          <p className="mt-2 text-sm text-slate-600">Tur for {ride.citizenProfile.user.name}</p>
        </div>
        <Link href="/dashboard/admin" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <form action={action} className="grid gap-5 rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm md:p-6">
        <FormMessage message={query.error} />

        <AddressAutocompleteInput id="pickupAddress" name="pickupAddress" label="Afhentningsadresse" initialValue={ride.pickupAddress} required />
        <AddressAutocompleteInput id="destinationAddress" name="destinationAddress" label="Destinationsadresse" initialValue={ride.destinationAddress} required />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <label htmlFor="date">Dato</label>
            <input id="date" name="date" type="date" defaultValue={ride.rideDate.toISOString().slice(0, 10)} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="time">Afgangstidspunkt</label>
            <input id="time" name="time" type="time" defaultValue={ride.rideTime} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="bus">Bus</label>
            <select id="bus" name="bus" defaultValue={ride.automaticShift?.bus ?? ""}>
              <option value="">Ingen bus valgt</option>
              {busOptions.map((bus) => <option key={bus} value={bus}>{busLabels[bus]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="passengers">Antal passagerer</label>
            <input id="passengers" name="passengers" type="number" min="1" max="6" defaultValue={ride.passengers} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="purpose">Formål</label>
            <input id="purpose" name="purpose" defaultValue={ride.purpose} required />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border-2 border-bus/25 bg-bus/10 p-4">
          <input className="mt-1 h-5 w-5" type="checkbox" name="isSharedRide" defaultChecked={ride.isSharedRide} />
          <span>
            <span className="block font-extrabold text-ink">Fællestur med sædereservation</span>
            <span className="mt-1 block text-sm font-normal text-slate-600">
              Andre borgere kan reservere de resterende pladser. {reservedSeats > 0 ? `${reservedSeats} ekstra plads(er) er allerede reserveret.` : "Ingen ekstra pladser er reserveret endnu."}
            </span>
          </span>
        </label>

        <div className="grid gap-3 rounded-2xl border-2 border-fjord/30 bg-cream p-4">
          <label className="flex items-start gap-3">
            <input className="mt-1 h-4 w-4" type="checkbox" name="includesMinors" defaultChecked={ride.includesMinors} />
            <span>Turen gælder børn eller unge</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="guardianName">Forælder/værge</label>
              <input id="guardianName" name="guardianName" defaultValue={ride.guardianName ?? ""} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="guardianPhone">Telefon til forælder/værge</label>
              <input id="guardianPhone" name="guardianPhone" type="tel" inputMode="tel" defaultValue={ride.guardianPhone ?? ""} />
            </div>
          </div>
          <label className="flex items-start gap-3">
            <input className="mt-1 h-4 w-4" type="checkbox" name="parentalConsent" defaultChecked={ride.parentalConsent} />
            <span>Forælder/værge har godkendt kørslen</span>
          </label>
        </div>

        <div className="grid gap-2">
          <label htmlFor="notes">Noter til chaufføren</label>
          <textarea id="notes" name="notes" rows={5} defaultValue={ride.notes ?? ""} />
        </div>

        <button type="submit" className="h-14 gap-2 bg-bus text-base text-white hover:bg-bus/90">
          <Save size={18} />
          Gem ændringer
        </button>
      </form>
    </main>
  );
}
