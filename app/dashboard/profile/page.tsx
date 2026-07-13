import Link from "next/link";
import { ArrowLeft, BadgeCheck, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/labels";
import { isRole } from "@/lib/domain";

function profilePhone(user: Awaited<ReturnType<typeof requireUser>>) {
  return user.citizenProfile?.phone ?? user.driverProfile?.phone ?? user.organizationProfile?.phone ?? "Ikke angivet";
}

function profileAddress(user: Awaited<ReturnType<typeof requireUser>>) {
  return user.citizenProfile?.address ?? user.organizationProfile?.address ?? "Ikke angivet";
}

export default async function ProfilePage() {
  const user = await requireUser();
  const role = isRole(user.role) ? user.role : "CITIZEN";

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-6 md:py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold uppercase text-bus">Profil</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink">Min profil</h1>
        </div>
        <Link href="/dashboard" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <section className="rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bus text-2xl font-extrabold text-ink">
            {user.name.slice(0, 1)}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-ink">{user.name}</h2>
            <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-fjord/20 px-3 py-1 text-xs font-bold text-ink">
              <BadgeCheck size={14} />
              {roleLabels[role]}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4">
          <div className="flex gap-3 rounded-2xl bg-cream px-4 py-3">
            <Mail className="mt-0.5 shrink-0 text-bus" size={18} />
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Email</dt>
              <dd className="font-semibold text-ink">{user.email}</dd>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl bg-cream px-4 py-3">
            <Phone className="mt-0.5 shrink-0 text-bus" size={18} />
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Telefon</dt>
              <dd className="font-semibold text-ink">{profilePhone(user)}</dd>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl bg-cream px-4 py-3">
            <MapPin className="mt-0.5 shrink-0 text-bus" size={18} />
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Adresse</dt>
              <dd className="font-semibold text-ink">{profileAddress(user)}</dd>
            </div>
          </div>
          {user.driverProfile?.licenseNumber ? (
            <div className="flex gap-3 rounded-2xl bg-cream px-4 py-3">
              <UserRound className="mt-0.5 shrink-0 text-bus" size={18} />
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Kørekort/reference</dt>
                <dd className="font-semibold text-ink">{user.driverProfile.licenseNumber}</dd>
              </div>
            </div>
          ) : null}
        </dl>
      </section>
    </main>
  );
}
