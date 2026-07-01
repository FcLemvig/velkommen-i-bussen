import { createRideRequestAction, deleteRideRequestAction } from "@/app/dashboard/citizen/actions";
import { FormMessage } from "@/components/FormMessage";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CitizenDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser(["CITIZEN"]);
  const rides = user.citizenProfile
    ? await prisma.rideRequest.findMany({
        where: { citizenProfileId: user.citizenProfile.id },
        orderBy: [{ rideDate: "desc" }, { rideTime: "desc" }],
        include: { assignment: { include: { driverProfile: { include: { user: true } } } } }
      })
    : [];

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Borgerdashboard</h1>
        <p className="mt-2 text-slate-600">Velkommen, {user.name}. Her kan du anmode om kørsel og følge dine ture.</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form action={createRideRequestAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold text-ink">Ny kørselsanmodning</h2>
            <p className="mt-1 text-sm text-slate-600">Udfyld oplysningerne, så kontoret kan planlægge turen.</p>
          </div>
          <FormMessage message={params.error} />
          {params.success ? (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {params.success}
            </p>
          ) : null}
          <div className="grid gap-2">
            <label htmlFor="pickupAddress">Afhentningsadresse</label>
            <input id="pickupAddress" name="pickupAddress" required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="destinationAddress">Destinationsadresse</label>
            <input id="destinationAddress" name="destinationAddress" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="date">Dato</label>
              <input id="date" name="date" type="date" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="time">Tidspunkt</label>
              <input id="time" name="time" type="time" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="passengers">Antal passagerer</label>
              <input id="passengers" name="passengers" type="number" min="1" max="8" defaultValue="1" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="purpose">Formål</label>
              <input id="purpose" name="purpose" placeholder="Fx læge, indkøb eller aktivitet" required />
            </div>
          </div>
          <div className="grid gap-3 rounded-md border border-[#e4d78c] bg-cream p-4">
            <label className="flex items-start gap-3">
              <input className="mt-1 h-4 w-4" type="checkbox" name="includesMinors" />
              <span>
                Turen gælder børn eller unge
                <span className="block text-xs font-normal text-slate-600">
                  Ved kørsel med børn og unge skal forælder eller værge have givet samtykke.
                </span>
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
            <label htmlFor="notes">Noter</label>
            <textarea id="notes" name="notes" rows={4} />
          </div>
          <button type="submit" className="bg-fjord text-white hover:bg-fjord/90">
            Send anmodning
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-ink">Mine ture</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 pr-4">Dato</th>
                  <th className="py-3 pr-4">Tur</th>
                  <th className="py-3 pr-4">Chauffør</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Handling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rides.map((ride) => (
                  <tr key={ride.id}>
                    <td className="py-3 pr-4">
                      {ride.rideDate.toLocaleDateString("da-DK")} kl. {ride.rideTime}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-ink">{ride.pickupAddress}</div>
                      <div className="text-slate-600">til {ride.destinationAddress}</div>
                    </td>
                    <td className="py-3 pr-4">
                      {ride.assignment?.driverProfile ? (
                        <div className="flex items-center gap-3">
                          {ride.assignment.driverProfile.imageUrl ? (
                            <img
                              src={ride.assignment.driverProfile.imageUrl}
                              alt={ride.assignment.driverProfile.user.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bus text-sm font-bold text-ink">
                              {ride.assignment.driverProfile.user.name.slice(0, 1)}
                            </div>
                          )}
                          <span>{ride.assignment.driverProfile.user.name}</span>
                        </div>
                      ) : (
                        "Ikke tildelt"
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={ride.status} />
                    </td>
                    <td className="py-3 pr-4">
                      {ride.status !== "COMPLETED" ? (
                        <form action={deleteRideRequestAction}>
                          <input type="hidden" name="rideRequestId" value={ride.id} />
                          <button type="submit" className="border border-red-200 bg-white text-red-700 hover:bg-red-50">
                            Slet
                          </button>
                        </form>
                      ) : (
                        <span className="text-slate-400">Låst</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rides.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Du har ingen kørselsanmodninger endnu.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
