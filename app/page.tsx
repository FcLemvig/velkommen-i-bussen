import Link from "next/link";
import { Bus, CalendarCheck, HandHeart, MapPin, Route, ShieldCheck, UserPlus, Users } from "lucide-react";

const paths = [
  {
    title: "Borger",
    text: "Book bussen til hverdagsture som indkøb, lægebesøg, transport til tog eller sociale aktiviteter.",
    href: "/register",
    action: "Opret bruger",
    icon: MapPin
  },
  {
    title: "Forening",
    text: "Book Bus Øst eller Bus Vest til træning, kampe, møder, arrangementer og fælles aktiviteter.",
    href: "/register",
    action: "Opret forening",
    icon: Users
  },
  {
    title: "Frivillig chauffør",
    text: "Tag en tjans, når det passer dig, og hjælp andre med at komme afsted i hverdagen.",
    href: "/register",
    action: "Bliv chauffør",
    icon: HandHeart
  }
];

const benefits = [
  ["Lokalt fællesskab", "Projektet skaber bedre transport og stærkere fællesskab i landsbyerne i Sydlemvig.", Bus],
  ["Nem planlægning", "Borgere, foreninger og frivillige får et enkelt overblik over ture, vagter og busbookinger.", CalendarCheck],
  ["Tryg adgang", "Hver rolle ser kun det, de skal bruge, og kan følge status på egne ture og bookinger.", ShieldCheck]
];

export default function HomePage() {
  return (
    <main className="bg-white">
      <section className="relative min-h-[680px] overflow-hidden bg-ink text-white">
        <img
          src="/hero-bus-community.jpg"
          alt="Frivillige foran bussen"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/58 to-ink/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-ink/30" />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <Link href="/" className="flex items-center gap-3 text-white">
            <img src="/velkommen-i-bussen-logo.png" alt="Velkommen i Bussen" className="h-14 w-14 rounded-full bg-white/20" />
            <span className="text-lg font-extrabold">Velkommen i Bussen</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="button bg-white/12 text-white ring-1 ring-white/30 hover:bg-white/20">
              Log ind
            </Link>
            <Link href="/register" className="button bg-bus text-white hover:bg-bus/90">
              Opret bruger
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[540px] max-w-6xl items-center px-4 py-12">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-white/14 px-4 py-2 text-sm font-extrabold uppercase text-white ring-1 ring-white/30">
              Naboer i bevægelse, liv i landsbyerne
            </p>
            <h1 className="text-5xl font-extrabold leading-tight text-white md:text-7xl">
              Lokal transport med mennesker bag rattet
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/95">
              Velkommen i Bussen er et lokalt mobilitetsprojekt, der giver lettere adgang til skole, tog, læge, indkøb
              og fritidsaktiviteter i landsbyerne omkring Sydlemvig.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="button gap-2 bg-white text-ink hover:bg-cream">
                <UserPlus size={18} />
                Opret bruger
              </Link>
              <Link href="/login" className="button bg-fjord text-ink hover:bg-fjord/90">
                Log ind
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-20 grid max-w-6xl gap-4 px-4 md:grid-cols-3">
        {paths.map(({ title, text, href, action, icon: Icon }) => (
          <article key={title} className="rounded-[28px] border-2 border-fjord/25 bg-white p-6 shadow-xl shadow-ink/10">
            <Icon className="mb-5 text-bus" size={30} />
            <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
            <p className="mt-3 min-h-24 text-sm leading-6 text-slate-600">{text}</p>
            <Link href={href} className="button mt-5 w-full bg-ink text-white hover:bg-ink/90">
              {action}
            </Link>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-extrabold uppercase text-bus">Om projektet</p>
          <h2 className="mt-3 text-4xl font-extrabold text-ink">Bedre transport og stærkere fællesskab</h2>
        </div>
        <div className="grid gap-5 text-base leading-8 text-slate-700">
          <p>
            Projektet ledes af Frivilligcenter Lemvig i samarbejde med lokale borgere, foreninger og Lemvig Kommune.
          </p>
          <p>
            Ordningen dækker områderne Møborg, Nees-Skalstrup, Bøvling, Bækmarksbro og Fjaltring-Trans, og gør det
            nemmere at deltage i hverdagsliv, fritidsaktiviteter og lokale fællesskaber.
          </p>
        </div>
      </section>

      <section className="border-y border-fjord/20 bg-cream">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3">
          {benefits.map(([title, text, Icon]) => (
            <article key={title as string} className="rounded-2xl bg-white p-5 shadow-sm">
              <Icon className="mb-4 text-bus" size={26} />
              <h3 className="text-lg font-extrabold text-ink">{title as string}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-extrabold uppercase text-bus">Spørg chaufføren</p>
          <h2 className="mt-2 text-3xl font-extrabold text-ink">Har du spørgsmål til ordningen?</h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Kontakt Frivilligcenter Lemvig, hvis du vil høre mere om medlemskab, booking eller frivillige chauffører.
          </p>
        </div>
        <a href="mailto:info@frivilligcenterlemvig.dk" className="button gap-2 bg-bus text-white hover:bg-bus/90">
          <Route size={18} />
          Skriv til os
        </a>
      </section>
    </main>
  );
}
