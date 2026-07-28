import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bus,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HandHeart,
  MapPin,
  Route,
  ShieldCheck,
  Users
} from "lucide-react";

const driverApplicationUrl =
  "https://forms.office.com/pages/responsepage.aspx?id=pfm-AYL47UmW96RSpRSJxtoHN0wvugVPt77tdHpuZBVUQks4VzY5MFY5QzA3T0hFS0ZaWVdDN1lYNy4u&origin=lprLink&route=shorturl";

const primaryActions = [
  {
    title: "Borger",
    text: "Opret profil og send en kørselsanmodning.",
    href: "/register",
    action: "Opret profil",
    icon: MapPin,
    external: false
  },
  {
    title: "Forening",
    text: "Book Bus Øst eller Bus Vest til aktiviteter.",
    href: "/register",
    action: "Opret forening",
    icon: Users,
    external: false
  },
  {
    title: "Chauffør",
    text: "Ansøg og bliv godkendt, før du kan køre.",
    href: driverApplicationUrl,
    action: "Ansøg",
    icon: HandHeart,
    external: true
  }
];

const appHighlights = [
  { title: "Ture", text: "Se status og beskeder.", icon: Route, color: "bg-fjord/15 text-ink" },
  { title: "Vagter", text: "Tag ledige vagter.", icon: CalendarDays, color: "bg-bus/15 text-brown" },
  { title: "Tryghed", text: "Godkendte chauffører.", icon: ShieldCheck, color: "bg-ink/10 text-ink" }
];

export default async function HomePage() {
  return (
    <main className="bg-cream">
      <section className="relative overflow-hidden bg-ink">
        <img
          src="/hero-bus-community.jpg"
          alt="Frivillige foran bussen"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-ink/78" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/95 via-ink/72 to-cream" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink to-transparent" />

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl gap-8 px-4 pb-12 pt-10 md:grid-cols-[1fr_390px] md:items-center md:pb-20 md:pt-16">
          <div className="max-w-2xl text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-extrabold uppercase text-ink shadow-lg shadow-ink/20">
              <Bus size={16} />
              Velkommen i Bussen
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.55)] sm:text-5xl md:text-6xl">
              Transport, vagter og busbooking samlet i en enkel app
            </h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-lg">
              For borgere, frivillige chauffører og lokale foreninger i Sydlemvig.
            </p>

            <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
              {primaryActions.map(({ title, text, href, action, icon: Icon, external }) => (
                <div key={title} className="rounded-3xl bg-white/94 p-4 text-ink shadow-xl shadow-ink/20 backdrop-blur">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-bus/15 text-brown">
                    <Icon size={21} />
                  </span>
                  <h2 className="mt-3 text-base font-extrabold">{title}</h2>
                  <p className="mt-1 min-h-12 text-sm leading-5 text-slate-600">{text}</p>
                  {external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-between rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-brown"
                    >
                      {action}
                      <ArrowRight size={17} />
                    </a>
                  ) : (
                    <Link
                      href={href}
                      className="mt-4 inline-flex w-full items-center justify-between rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-brown"
                    >
                      {action}
                      <ArrowRight size={17} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm rounded-[34px] border border-white/35 bg-white/95 p-4 shadow-2xl shadow-ink/35 backdrop-blur">
            <div className="flex items-center justify-between border-b border-fjord/20 pb-4">
              <div className="flex items-center gap-3">
                <img src="/velkommen-i-bussen-logo.png" alt="" className="h-12 w-12 rounded-full" />
                <div>
                  <p className="font-extrabold text-ink">Min oversigt</p>
                  <p className="text-xs text-slate-600">Klar til test</p>
                </div>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-fjord/15 text-ink">
                <Bell size={19} />
              </span>
            </div>

            <div className="mt-4 rounded-3xl bg-ink p-4 text-white">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white/80">Næste tur</p>
                <span className="rounded-full bg-bus px-3 py-1 text-xs font-extrabold text-white">Afventer</span>
              </div>
              <p className="mt-4 text-2xl font-extrabold">Frivilligcenter Lemvig</p>
              <div className="mt-4 grid gap-2 text-sm text-white/82">
                <p className="flex items-center gap-2">
                  <Clock3 size={16} />
                  I dag kl. 10:00
                </p>
                <p className="flex items-center gap-2">
                  <MapPin size={16} />
                  Afhentning og destination samlet
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {appHighlights.map(({ title, text, icon: Icon, color }) => (
                <div key={title} className="flex items-center gap-3 rounded-3xl bg-cream p-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-2xl ${color}`}>
                    <Icon size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-ink">{title}</p>
                    <p className="text-xs text-slate-600">{text}</p>
                  </div>
                  <CheckCircle2 className="text-fjord" size={19} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-12 md:grid-cols-[0.8fr_1.2fr] md:items-center">
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

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="grid gap-4 rounded-[30px] bg-white p-5 shadow-lg shadow-ink/8 md:grid-cols-[1fr_auto] md:items-center md:p-7">
          <div>
            <p className="text-sm font-extrabold uppercase text-fjord">Spørgsmål</p>
            <h2 className="mt-2 text-2xl font-extrabold text-ink">Vil du høre mere om ordningen?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Kontakt Frivilligcenter Lemvig om medlemskab, booking eller frivillige chauffører.
            </p>
          </div>
          <a href="mailto:info@frivilligcenterlemvig.dk" className="button gap-2 bg-bus text-white hover:bg-bus/90">
            <Route size={18} />
            Skriv til os
          </a>
        </div>
      </section>
    </main>
  );
}
