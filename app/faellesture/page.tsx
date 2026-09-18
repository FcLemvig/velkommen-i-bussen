import Link from "next/link";
import { ArrowLeft, ArrowRight, Bus, CalendarDays, ChevronDown, MapPin, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { departureTownFromSharingTitle } from "@/lib/ride-sharing";
import { busLabels, BusName } from "@/lib/shifts";

export const dynamic = "force-dynamic";

export default async function PublicSharedRidesPage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const events = await prisma.event.findMany({
    where: { eventDate: { gte: today }, status: "OPEN" },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
    take: 60,
    include: { signups: true }
  });

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 pt-5 md:py-8">
      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white">
          <ArrowLeft size={16} />
          Forsiden
        </Link>
        <p className="mt-6 text-sm font-bold uppercase text-white/75">Åbent for alle</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Kommende fællesture</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
          Se hvor bussen kører hen, hvornår den afgår, og hvor mange sæder der er ledige. Du skal være medlem for at reservere en plads.
        </p>
      </section>

      <section className="grid gap-4">
        {events.map((event) => {
          const takenSeats = event.signups.reduce((sum, signup) => sum + signup.passengers, 0);
          const remainingSeats = Math.max(event.capacity - takenSeats, 0);
          const departureTown = event.sourceRideRequestId ? departureTownFromSharingTitle(event.title) : null;

          return (
            <details key={event.id} className="group overflow-hidden rounded-[28px] border-2 border-fjord/20 bg-white shadow-sm">
              <summary className="flex min-h-24 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:content-none">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <CalendarDays size={16} />
                    {event.eventDate.toLocaleDateString("da-DK")}
                  </p>
                  <h2 className="mt-2 text-xl font-extrabold text-ink">{event.title}</h2>
                  <p className="mt-1 text-sm font-bold text-brown">
                    {departureTown ? `Afgang fra ${departureTown} kl. ${event.startTime}` : `Kl. ${event.startTime}-${event.endTime}`}
                  </p>
                </div>
                <ChevronDown className="shrink-0 text-bus transition-transform group-open:rotate-180" size={24} />
              </summary>

              <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                <p className="max-w-2xl text-sm leading-6 text-slate-700">{event.description}</p>
                <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                  <p className="flex items-center gap-2"><MapPin className="text-bus" size={17} />{event.location}</p>
                  <p className="flex items-center gap-2"><Bus className="text-bus" size={17} />{busLabels[(event.bus || "EAST") as BusName]}</p>
                  <p className="flex items-center gap-2"><UsersRound className="text-bus" size={17} />{remainingSeats} ledige plads(er)</p>
                </div>
                {event.pickupInfo ? <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-slate-700"><strong className="text-ink">Afgang og opsamling:</strong> {event.pickupInfo}</p> : null}
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Link href="/register?type=citizen" className="button justify-between bg-bus text-white hover:bg-bus/90">Opret medlemsprofil <ArrowRight size={17} /></Link>
                  <Link href="/login" className="button justify-center border-2 border-fjord/30 bg-white text-ink hover:bg-cream">Log ind og reservér</Link>
                </div>
              </div>
            </details>
          );
        })}

        {events.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-fjord/25 bg-white p-8 text-center">
            <CalendarDays className="mx-auto text-bus" size={34} />
            <h2 className="mt-3 text-xl font-extrabold text-ink">Ingen åbne fællesture lige nu</h2>
            <p className="mt-2 text-sm text-slate-600">Nye fællesture bliver vist her, så snart de er klar.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
