import Link from "next/link";
import { ArrowLeft, BadgeCheck, CreditCard, KeyRound, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { changePasswordAction } from "@/app/dashboard/profile/actions";
import { FormMessage } from "@/components/FormMessage";
import { accessRolesForUser, requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/labels";
import { membershipLabel, membershipTypeLabel } from "@/lib/membership";

function profilePhone(user: Awaited<ReturnType<typeof requireUser>>) {
  return user.citizenProfile?.phone ?? user.driverProfile?.phone ?? user.organizationProfile?.phone ?? "Ikke angivet";
}

function profileAddress(user: Awaited<ReturnType<typeof requireUser>>) {
  return user.citizenProfile?.address ?? user.organizationProfile?.address ?? "Ikke angivet";
}

export default async function ProfilePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const accessRoles = accessRolesForUser(user);
  const hasMembershipProfile = Boolean(user.citizenProfile || user.organizationProfile);

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

      <FormMessage message={params.error || params.success} />

      <section className="rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bus text-2xl font-extrabold text-ink">
            {user.name.slice(0, 1)}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-ink">{user.name}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {accessRoles.map((role) => (
                <span key={role} className="inline-flex items-center gap-2 rounded-full bg-fjord/20 px-3 py-1 text-xs font-bold text-ink">
                  <BadgeCheck size={14} />
                  {roleLabels[role]}
                </span>
              ))}
            </div>
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
          {hasMembershipProfile ? (
            <div className="flex gap-3 rounded-2xl bg-cream px-4 py-3">
              <CreditCard className="mt-0.5 shrink-0 text-bus" size={18} />
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Medlemskab</dt>
                <dd className="font-semibold text-ink">{membershipTypeLabel(user.membership)}</dd>
                <dd className="text-sm text-slate-600">Status: {membershipLabel(user.membership)}</dd>
              </div>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-bus/15 text-brown">
            <KeyRound size={22} />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-ink">Skift adgangskode</h2>
            <p className="mt-1 text-sm text-slate-600">
              Brug denne, n&aring;r du har f&aring;et en midlertidig adgangskode og vil v&aelig;lge din egen.
            </p>
          </div>
        </div>

        <form action={changePasswordAction} className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="currentPassword">Nuv&aelig;rende adgangskode</label>
            <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="newPassword">Ny adgangskode</label>
              <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="confirmPassword">Gentag ny adgangskode</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
            </div>
          </div>
          <button type="submit" className="w-full bg-bus text-white hover:bg-bus/90 sm:w-fit">
            Skift adgangskode
          </button>
        </form>
      </section>
    </main>
  );
}
