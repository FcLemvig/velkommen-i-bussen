import Link from "next/link";
import { CalendarCheck, MapPin, ShieldCheck, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main>
      <section className="border-b border-[#e4d78c] bg-cream">
        <div className="mx-auto grid min-h-[520px] max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <img src="/velkommen-i-bussen-logo.png" alt="Velkommen i Bussen" className="mb-8 h-28 w-28 rounded-full" />
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-leaf">
              Frivillig transport med nærvær
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink md:text-6xl">
              Velkommen i Bussen
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
              Naboer i bevægelse, liv i landsbyerne. En enkel kørselsordning, hvor borgere kan anmode om ture,
              frivillige chauffører kan se deres opgaver, og koordinatorer kan holde overblik over hele dagen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="button bg-leaf text-white hover:bg-leaf/90">
                Opret profil
              </Link>
              <Link href="/login" className="button border border-[#d7c85f] bg-white text-ink hover:bg-[#fff3b5]">
                Log ind
              </Link>
            </div>
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-lg shadow-xl">
            <img
              src="/hero-bus-community.jpg"
              alt="Frivillige foran bussen"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 rounded-md bg-white/92 px-4 py-3 text-sm font-semibold text-ink shadow-sm">
              Naboer i bevægelse
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-4">
        {[
          ["Nem bestilling", "Borgeren opretter en tur med adresse, dato og formål.", MapPin],
          ["Fælles overblik", "Admin ser alle anmodninger og fordeler chauffører.", Users],
          ["Tydelig status", "Alle kan følge med i, om turen afventer, er tildelt eller gennemført.", CalendarCheck],
          ["Rollebaseret adgang", "Borger, chauffør og admin ser kun det, de skal bruge.", ShieldCheck]
        ].map(([title, text, Icon]) => (
          <article key={title as string} className="rounded-lg border border-[#e4d78c] bg-white p-5">
            <Icon className="mb-4 text-leaf" size={24} />
            <h2 className="font-semibold text-ink">{title as string}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
