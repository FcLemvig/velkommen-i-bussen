import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { busLabels, busOptions, BusName } from "@/lib/shifts";

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sameDate(left: Date, right: Date) {
  return left.toDateString() === right.toDateString();
}

export default async function BusCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const params = await searchParams;
  const selectedDate = params.week ? new Date(`${params.week}T00:00:00`) : new Date();
  const weekStart = startOfWeek(Number.isNaN(selectedDate.getTime()) ? new Date() : selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = addDays(weekStart, 7);

  const [shifts, bookings] = await Promise.all([
    prisma.driverShift.findMany({
      where: {
        shiftDate: {
          gte: weekStart,
          lt: weekEnd
        }
      },
      orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
      include: { driverProfile: { include: { user: true } } }
    }),
    prisma.busBooking.findMany({
      where: {
        bookingDate: {
          gte: weekStart,
          lt: weekEnd
        },
        status: { not: "CANCELLED" }
      },
      orderBy: [{ bookingDate: "asc" }, { startTime: "asc" }],
      include: {
        organizationProfile: { include: { user: true } },
        driverProfile: { include: { user: true } }
      }
    })
  ]);

  const previousWeek = toDateInputValue(addDays(weekStart, -7));
  const nextWeek = toDateInputValue(addDays(weekStart, 7));
  const thisWeek = toDateInputValue(new Date());

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Buskalender</h1>
          <p className="mt-2 text-slate-600">Se hvornår Bus Øst og Bus Vest er booket via vagter og foreningsbookinger.</p>
        </div>
        <Link href="/dashboard/admin" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <section className="rounded-[32px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-bus" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Uge {weekStart.toLocaleDateString("da-DK")} - {addDays(weekStart, 6).toLocaleDateString("da-DK")}
              </h2>
              <p className="text-sm text-slate-600">Orange er foreningsbookinger. Turkis er vagter.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/admin/buses?week=${previousWeek}`} className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
              <ChevronLeft size={16} />
              Forrige uge
            </Link>
            <Link href={`/dashboard/admin/buses?week=${thisWeek}`} className="button border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
              Denne uge
            </Link>
            <Link href={`/dashboard/admin/buses?week=${nextWeek}`} className="button gap-2 bg-bus text-white hover:bg-bus/90">
              Næste uge
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-[32px] border-2 border-fjord/25 bg-white shadow-sm">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50 text-sm font-bold text-ink">
            <div className="px-4 py-3">Bus</div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="border-l border-slate-200 px-4 py-3">
                <div>{day.toLocaleDateString("da-DK", { weekday: "short" })}</div>
                <div className="text-xs font-medium text-slate-500">{day.toLocaleDateString("da-DK")}</div>
              </div>
            ))}
          </div>

          {busOptions.map((bus) => (
            <div key={bus} className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0">
              <div className="bg-cream px-4 py-4 font-bold text-ink">{busLabels[bus as BusName]}</div>
              {weekDays.map((day) => {
                const dayShifts = shifts.filter((shift) => shift.bus === bus && sameDate(shift.shiftDate, day));
                const dayBookings = bookings.filter((booking) => booking.bus === bus && sameDate(booking.bookingDate, day));

                return (
                  <div key={`${bus}-${day.toISOString()}`} className="min-h-36 border-l border-slate-100 p-3">
                    <div className="grid gap-2">
                      {dayBookings.map((booking) => (
                        <div key={booking.id} className="rounded-2xl border border-bus/30 bg-bus/10 px-3 py-2 text-sm text-ink">
                          <div className="font-bold">
                            {booking.startTime} - {booking.endTime}
                          </div>
                          <div className="mt-1 text-xs text-slate-700">{booking.organizationProfile.user.name}</div>
                          <div className="mt-1 text-xs text-slate-600">Chauffør: {booking.driverProfile.user.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{booking.purpose}</div>
                        </div>
                      ))}
                      {dayShifts.map((shift) => (
                        <Link
                          key={shift.id}
                          href={`/dashboard/admin/shifts/${shift.id}`}
                          className="rounded-2xl border border-fjord/30 bg-fjord/10 px-3 py-2 text-sm text-ink hover:bg-fjord/20"
                        >
                          <div className="font-bold">
                            {shift.startTime} - {shift.endTime}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {shift.driverProfile?.user.name ?? "Mangler chauffør"}
                          </div>
                          {shift.notes ? <div className="mt-1 text-xs text-slate-500">{shift.notes}</div> : null}
                        </Link>
                      ))}
                      {dayShifts.length === 0 && dayBookings.length === 0 ? <span className="text-xs text-slate-400">Ledig</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/admin/shifts" className="button bg-bus text-white hover:bg-bus/90">
          Opret eller rediger vagt
        </Link>
      </div>
    </main>
  );
}
