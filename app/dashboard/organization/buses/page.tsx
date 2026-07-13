import Link from "next/link";
import { ArrowLeft, Bus, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
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

export default async function OrganizationBusCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireUser(["ORGANIZATION"]);
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
      orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }]
    }),
    prisma.busBooking.findMany({
      where: {
        bookingDate: {
          gte: weekStart,
          lt: weekEnd
        },
        status: { not: "CANCELLED" }
      },
      orderBy: [{ bookingDate: "asc" }, { startTime: "asc" }]
    })
  ]);

  const occupied = [
    ...bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      bus: booking.bus,
      date: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime
    })),
    ...shifts.map((shift) => ({
      id: `shift-${shift.id}`,
      bus: shift.bus,
      date: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime
    }))
  ].sort((left, right) => left.date.getTime() - right.date.getTime() || left.startTime.localeCompare(right.startTime));

  const previousWeek = toDateInputValue(addDays(weekStart, -7));
  const nextWeek = toDateInputValue(addDays(weekStart, 7));
  const thisWeek = toDateInputValue(new Date());

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-5 md:py-8">
      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-white/75">Buskalender</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Optagede tider</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
              Se hvornår Bus Øst og Bus Vest er optaget. Navn, chauffør og formål vises ikke her.
            </p>
          </div>
          <Link href="/dashboard/organization" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <ArrowLeft size={16} />
            Tilbage
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-bus" size={24} />
            <div>
              <h2 className="text-xl font-extrabold text-ink">
                {weekStart.toLocaleDateString("da-DK")} - {addDays(weekStart, 6).toLocaleDateString("da-DK")}
              </h2>
              <p className="text-sm text-slate-600">{occupied.length} optaget tid(er) i denne uge</p>
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
            <Link href={`/dashboard/organization/buses?week=${previousWeek}`} className="button gap-1 border-2 border-fjord/30 bg-white px-3 text-ink hover:bg-cream">
              <ChevronLeft size={16} />
              Forrige
            </Link>
            <Link href={`/dashboard/organization/buses?week=${thisWeek}`} className="button border-2 border-fjord/30 bg-white px-3 text-ink hover:bg-cream">
              Denne
            </Link>
            <Link href={`/dashboard/organization/buses?week=${nextWeek}`} className="button gap-1 bg-bus px-3 text-white hover:bg-bus/90">
              Næste
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:hidden">
        {occupied.map((item) => (
          <article key={item.id} className="rounded-[24px] border-2 border-fjord/20 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-500">{item.date.toLocaleDateString("da-DK", { weekday: "long" })}</p>
                <h3 className="mt-1 text-lg font-extrabold text-ink">
                  {item.date.toLocaleDateString("da-DK")} kl. {item.startTime}-{item.endTime}
                </h3>
              </div>
              <span className="rounded-full bg-bus/15 px-3 py-1.5 text-xs font-bold text-brown">Optaget</span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Bus className="text-bus" size={17} />
              {busLabels[(item.bus || "EAST") as BusName]}
            </p>
          </article>
        ))}
        {occupied.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-fjord/25 bg-white p-8 text-center text-slate-500">
            <CalendarDays className="mx-auto text-bus" size={34} />
            <h3 className="mt-3 text-xl font-extrabold text-ink">Ingen optagede tider</h3>
            <p className="mt-2 text-sm text-slate-600">Begge busser ser ledige ud i denne uge.</p>
          </div>
        ) : null}
      </section>

      <section className="hidden overflow-x-auto rounded-[32px] border-2 border-fjord/25 bg-white shadow-sm md:block">
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
              <div className="bg-cream px-4 py-4 font-bold text-ink">{busLabels[bus]}</div>
              {weekDays.map((day) => {
                const dayShifts = shifts.filter((shift) => shift.bus === bus && sameDate(shift.shiftDate, day));
                const dayBookings = bookings.filter((booking) => booking.bus === bus && sameDate(booking.bookingDate, day));

                return (
                  <div key={`${bus}-${day.toISOString()}`} className="min-h-36 border-l border-slate-100 p-3">
                    <div className="grid gap-2">
                      {[...dayBookings, ...dayShifts].map((item) => (
                        <div key={item.id} className="rounded-2xl border border-bus/30 bg-bus/10 px-3 py-2 text-sm text-ink">
                          <div className="font-bold">
                            {item.startTime} - {item.endTime}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">Optaget</div>
                        </div>
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
    </main>
  );
}
