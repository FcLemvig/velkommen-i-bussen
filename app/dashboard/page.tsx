import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Bus, ShieldCheck, UserRound } from "lucide-react";
import { accessRolesForUser, dashboardPathForRole, requireUser } from "@/lib/auth";

const roleCards = {
  ADMIN: {
    title: "Admin",
    text: "Planlæg ture, vagter, chauffører og medlemskaber.",
    icon: ShieldCheck
  },
  CITIZEN: {
    title: "Borger",
    text: "Opret ture og følg dine anmodninger.",
    icon: UserRound
  },
  DRIVER: {
    title: "Chauffør",
    text: "Se dine ture og tag ledige vagter.",
    icon: Bus
  },
  ORGANIZATION: {
    title: "Forening/institution",
    text: "Book bus og se jeres bookinger.",
    icon: Building2
  }
};

export default async function DashboardPage() {
  const user = await requireUser();
  const roles = accessRolesForUser(user);

  if (roles.length === 1) {
    redirect(dashboardPathForRole(roles[0]));
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <p className="text-sm font-bold uppercase text-white/75">Min side</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Hej {user.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
          Vælg hvilken del af Velkommen i Bussen du vil arbejde med.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => {
          const card = roleCards[role];
          const Icon = card.icon;

          return (
            <Link
              key={role}
              href={dashboardPathForRole(role)}
              className="rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-bus/40 hover:shadow-lg"
            >
              <Icon className="text-bus" size={30} />
              <h2 className="mt-4 text-xl font-extrabold text-ink">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
