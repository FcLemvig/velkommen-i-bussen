import { cancelOrganizationBookingAction, createOrganizationBookingAction } from "@/app/dashboard/organization/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { busLabels, busOptions, BusName } from "@/lib/shifts";

export default async function OrganizationDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser(["ORGANIZATION"]);

  const [drivers, bookings] = user.organizationProfile
    ? await Promise.all([
        prisma.driverProfile.findMany({
          where: { isActive: true },
          orderBy: { user: { name: "asc" } },
          include: { user: true }
        }),
        prisma.busBooking.findMany({
          where: { organizationProfileId: user.organizationProfile.id },
          orderBy: [{ bookingDate: "desc" }, { startTime: "desc" }],
          include: { driverProfile: { include: { user: true } } }
        })
      ])
    : [[], []];

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Forening/institution</h1>
        <p className="mt-2 text-slate-600">
          Velkommen, {user.name}. Her kan I booke en frivilligbus og tilknytte en frivillig chauffør.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form action={createOrganizationBookingAction} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-ink">Ny busbooking</h2>
            <p className="mt-1 text-sm text-slate-600">Vælg bus, tidspunkt og frivillig chauffør.</p>
          </div>
          <FormMessage message={params.error} />
          {params.success ? (
            <p className="rounded-2xl border border-fjord/30 bg-fjord/10 px-4 py-3 text-sm font-semibold text-ink">
              {params.success}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="bus">Bus</label>
              <select id="bus" name="bus" defaultValue="EAST" required>
                {busOptions.map((bus) => (
                  <option key={bus} value={bus}>
                    {busLabels[bus]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="driverProfileId">Frivillig chauffør</label>
              <select id="driverProfileId" name="driverProfileId" required>
                <option value="">Vælg chauffør</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <label htmlFor="date">Dato</label>
              <input id="date" name="date" type="date" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="startTime">Start</label>
              <input id="startTime" name="startTime" type="time" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="endTime">Slut</label>
              <input id="endTime" name="endTime" type="time" required />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="purpose">Formål</label>
            <input id="purpose" name="purpose" placeholder="Fx aktivitet, udflugt eller arrangement" required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="notes">Noter</label>
            <textarea id="notes" name="notes" rows={4} />
          </div>
          <button type="submit" className="bg-bus text-white hover:bg-bus/90">
            Book bus
          </button>
        </form>

        <div className="rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-ink">Mine bookinger</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 pr-4">Dato</th>
                  <th className="py-3 pr-4">Bus</th>
                  <th className="py-3 pr-4">Chauffør</th>
                  <th className="py-3 pr-4">Formål</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Handling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="py-3 pr-4">
                      {booking.bookingDate.toLocaleDateString("da-DK")} kl. {booking.startTime}-{booking.endTime}
                    </td>
                    <td className="py-3 pr-4">{busLabels[(booking.bus || "EAST") as BusName]}</td>
                    <td className="py-3 pr-4">{booking.driverProfile.user.name}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-ink">{booking.purpose}</div>
                      {booking.notes ? <div className="text-slate-500">Note: {booking.notes}</div> : null}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${booking.status === "CANCELLED" ? "bg-red-100 text-red-800" : "bg-fjord/25 text-ink"}`}>
                        {booking.status === "CANCELLED" ? "Annulleret" : "Bekræftet"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {booking.status !== "CANCELLED" ? (
                        <form action={cancelOrganizationBookingAction}>
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <button type="submit" className="border border-red-200 bg-white text-red-700 hover:bg-red-50">
                            Annuller
                          </button>
                        </form>
                      ) : (
                        <span className="text-slate-400">Lukket</span>
                      )}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      I har ingen busbookinger endnu.
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
