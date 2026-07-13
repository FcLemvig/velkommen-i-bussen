import Link from "next/link";
import { Bell, CalendarCheck, HandHeart, MapPin, Route, Users } from "lucide-react";

const driverApplicationUrl =
  "https://forms.office.com/pages/responsepage.aspx?id=pfm-AYL47UmW96RSpRSJxtoHN0wvugVPt77tdHpuZBVUQks4VzY5MFY5QzA3T0hFS0ZaWVdDN1lYNy4u&origin=lprLink&route=shorturl";

const primaryActions = [
  {
    title: "Jeg vil booke en tur",
    text: "Opret en profil og send en kørselsanmodning.",
    href: "/register",
    action: "Opret bruger",
    icon: MapPin,
    external: false
  },
  {
    title: "Vi er en forening",
    text: "Book Bus Øst eller Bus Vest til aktiviteter.",
    href: "/register",
    action: "Opret forening",
    icon: Users,
    external: false
  },
  {
    title: "Jeg vil køre frivilligt",
    text: "Ansøg som chauffør og bliv godkendt først.",
    href: driverApplicationUrl,
    action: "Ansøg",
    icon: HandHeart,
    external: true
  }
];

const appHighlights = [
  { title: "Ture", text: "Følg status på egne ture.", icon: Route },
  { title: "Vagter", text: "Chauffører kan tage ledige vagter.", icon: CalendarCheck },
  { title: "Beskeder", text: "Push og beskeder samlet ét sted.", icon: Bell }
];

export default async function HomePage() {
  return (
    <main className="bg-cream">
      <section className="relative overflow-hidden bg-ink text-white">
        <img
          src="/hero-bus-community.jpg"
          alt="Frivillige foran bussen"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-ink/72" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-cream to-transparent" />

        <div className="relative z-10 mx-auto grid min-h-[620px] max-w-6xl items-end gap-8 px-4 pb-24 pt-14 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pb-28 md:pt-20">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full bg-white/14 px-4 py-2 text-xs font-extrabold uppercase text-white ring-1 ring-white/30">
              Naboer i bevægelse
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl">
              Lokal transport med mennesker bag rattet
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
              Book ture, find vagter og få besked, når der sker noget vigtigt i Velkommen i Bussen.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/20 bg-white/94 p-4 text-ink shadow-2xl shadow-ink/30 backdrop-blur md:ml-auto md:max-w-sm">
            <div className="flex items-center gap-3 border-b border-fjord/20 pb-4">
              <img src="/velkommen-i-bussen-logo.png" alt="" className="h-12 w-12 rounded-full" />
              <div>
                <p className="text-sm font-extrabold text-ink">Velkommen i Bussen</p>
                <p className="text-xs text-slate-600">Din lokale transport-app</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {appHighlights.map(({ title, text, icon: Icon }) => (
                <div key={title} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-bus/15 text-brown">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="font-bold text-ink">{title}</p>
                    <p className="text-xs text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-16 grid max-w-6xl gap-3 px-4 md:grid-cols-3">
        {primaryActions.map(({ title, text, href, action, icon: Icon, external }) => (
          <article key={title} className="rounded-[24px] border border-fjord/20 bg-white p-5 shadow-lg shadow-ink/10">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-bus/15 text-brown">
                <Icon size={22} />
              </span>
              <div>
                <h2 className="font-extrabold text-ink">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            </div>
            {external ? (
              <a href={href} target="_blank" rel="noreferrer" className="button mt-4 w-full bg-ink text-white hover:bg-ink/90">
                {action}
              </a>
            ) : (
              <Link href={href} className="button mt-4 w-full bg-ink text-white hover:bg-ink/90">
                {action}
              </Link>
            )}
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-12 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div>
          <p className="text-sm font-extrabold uppercase text-bus">Om projektet</p>
          <h2 className="mt-2 text-3xl font-extrabold text-ink">Bedre transport og stærkere fællesskab</h2>
        </div>
        <div className="grid gap-4 text-sm leading-7 text-slate-700 sm:text-base">
          <p>Projektet ledes af Frivilligcenter Lemvig i samarbejde med lokale borgere, foreninger og Lemvig Kommune.</p>
          <p>
            Ordningen dækker Møborg, Nees-Skalstrup, Bøvling, Bækmarksbro og Fjaltring-Trans og gør det nemmere at
            deltage i hverdagsliv, fritidsaktiviteter og lokale fællesskaber.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-14 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-[28px] bg-ink p-5 text-white md:p-7">
          <p className="text-sm font-extrabold uppercase text-bus">Spørgsmål</p>
          <h2 className="mt-2 text-2xl font-extrabold">Vil du høre mere om ordningen?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
            Kontakt Frivilligcenter Lemvig om medlemskab, booking eller frivillige chauffører.
          </p>
          <a href="mailto:info@frivilligcenterlemvig.dk" className="button mt-5 gap-2 bg-bus text-white hover:bg-bus/90">
            <Route size={18} />
            Skriv til os
          </a>
        </div>
      </section>
    </main>
  );
}
