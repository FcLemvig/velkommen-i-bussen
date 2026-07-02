import Link from "next/link";
import { CalendarCheck, MapPin, ShieldCheck, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main>
      <section className="border-b border-bus/20 bg-cream">
        <div className="mx-auto grid min-h-[560px] max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] bg-bus px-6 py-8 text-white shadow-xl shadow-bus/20 sm:px-10">
            <img src="/velkommen-i-bussen-logo.png" alt="Velkommen i Bussen" className="mb-8 h-28 w-28 rounded-full bg-white/20" />
            <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-white/90">
              Roligt. Lokalt. Menneskeligt.
            </p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-none text-white md:text-6xl">
              Velkommen i Bussen
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/95">
              Frivilligbusserne hjælper dig trygt frem i lokalområdet. Her mødes borgere, frivillige chauffører og
              kontoret i en enkel løsning med nærvær i centrum.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="button bg-white text-ink hover:bg-cream">
                Book en tur
              </Link>
              <Link href="/login" className="button bg-fjord text-ink hover:bg-fjord/90">
                Log ind
              </Link>
            </div>
          </div>
          <div className="relative min-h-[360px] overflow-hidden rounded-[32px] border-4 border-white shadow-xl">
            <img
              src="/hero-bus-community.jpg"
              alt="Frivillige foran bussen"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 rounded-full bg-white/95 px-5 py-3 text-sm font-extrabold text-ink shadow-sm">
              Sammen får vi flere med
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-4">
        {[
          ["Nem bestilling", "Borgeren opretter en tur med adresse, dato og formål.", MapPin],
          ["Fælles overblik", "Kontoret ser anmodninger og fordeler frivillige chauffører.", Users],
          ["Tydelig status", "Alle kan følge med i, om turen afventer, er tildelt eller gennemført.", CalendarCheck],
          ["Tryg adgang", "Borger, chauffør og admin ser kun det, de skal bruge.", ShieldCheck]
        ].map(([title, text, Icon]) => (
          <article key={title as string} className="rounded-2xl border-2 border-fjord/35 bg-white p-5 shadow-sm">
            <Icon className="mb-4 text-bus" size={26} />
            <h2 className="text-lg font-extrabold text-ink">{title as string}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
