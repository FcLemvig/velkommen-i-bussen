import Link from "next/link";
import { ArrowLeft, Building2, Bus, Check, UserRound } from "lucide-react";
import {
  addCitizenAccessToUserAction,
  addDriverAccessToUserAction,
  addOrganizationAccessToUserAction
} from "@/app/dashboard/admin/users/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { membershipLabel, membershipTypeLabel } from "@/lib/membership";
import { organizationName } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

function AccessBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-fjord/25 text-ink" : "bg-slate-100 text-slate-500"}`}>
      {active ? <Check size={13} /> : null}
      {label}
    </span>
  );
}

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const params = await searchParams;
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      citizenProfile: true,
      driverProfile: true,
      organizationProfile: true,
      organizationMemberships: { include: { organizationProfile: { include: { user: true } } } },
      membership: true
    }
  });

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Brugere og adgange</h1>
          <p className="mt-2 text-slate-600">Giv samme login adgang som borger, chauffør og forening/institution.</p>
        </div>
        <Link href="/dashboard/admin" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <FormMessage message={params.error || params.success} />

      <section className="grid gap-4">
        {users.map((user) => {
          const defaultPhone = user.citizenProfile?.phone || user.driverProfile?.phone || user.organizationProfile?.phone || "";
          const defaultAddress = user.citizenProfile?.address || user.organizationProfile?.address || "";
          const orgName = user.organizationProfile
            ? organizationName({ ...user.organizationProfile, user })
            : user.organizationMemberships.map((membership) => organizationName(membership.organizationProfile)).join(", ");

          return (
            <article key={user.id} className="grid gap-4 rounded-[28px] border-2 border-fjord/20 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-ink">{user.name}</h2>
                  <p className="break-all text-sm text-slate-600">{user.email}</p>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {membershipTypeLabel(user.membership)} · {membershipLabel(user.membership)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AccessBadge active={Boolean(user.citizenProfile)} label="Borger" />
                  <AccessBadge active={Boolean(user.driverProfile)} label="Chauffør" />
                  <AccessBadge active={Boolean(user.organizationProfile || user.organizationMemberships.length > 0)} label="Forening" />
                  {user.role === "ADMIN" ? <AccessBadge active label="Admin" /> : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {user.citizenProfile ? (
                  <div className="rounded-2xl bg-cream p-4 text-sm">
                    <p className="flex items-center gap-2 font-extrabold text-ink"><UserRound size={16} /> Borgeradgang aktiv</p>
                    <p className="mt-2 text-slate-600">{user.citizenProfile.address || "Adresse mangler"}</p>
                  </div>
                ) : (
                  <form action={addCitizenAccessToUserAction} className="grid gap-3 rounded-2xl bg-cream p-4">
                    <input type="hidden" name="userId" value={user.id} />
                    <p className="flex items-center gap-2 font-extrabold text-ink"><UserRound size={16} /> Tilføj borger</p>
                    <input name="citizenPhone" type="tel" placeholder="Telefon" defaultValue={defaultPhone} required />
                    <input name="citizenAddress" placeholder="Adresse" defaultValue={defaultAddress} required />
                    <select name="membershipType" defaultValue="INDIVIDUAL">
                      <option value="INDIVIDUAL">Borger</option>
                      <option value="FAMILY">Familie</option>
                    </select>
                    <button type="submit" className="bg-bus text-white hover:bg-bus/90">Tilføj borgeradgang</button>
                  </form>
                )}

                {user.driverProfile ? (
                  <div className="rounded-2xl bg-cream p-4 text-sm">
                    <p className="flex items-center gap-2 font-extrabold text-ink"><Bus size={16} /> Chaufføradgang aktiv</p>
                    <p className="mt-2 text-slate-600">{user.driverProfile.isActive ? "Aktiv chauffør" : "Ikke aktiv"}</p>
                  </div>
                ) : (
                  <form action={addDriverAccessToUserAction} className="grid gap-3 rounded-2xl bg-cream p-4">
                    <input type="hidden" name="userId" value={user.id} />
                    <p className="flex items-center gap-2 font-extrabold text-ink"><Bus size={16} /> Tilføj chauffør</p>
                    <input name="driverPhone" type="tel" placeholder="Telefon" defaultValue={defaultPhone} />
                    <input name="licenseNumber" placeholder="Kørekortnummer" />
                    <textarea name="driverNotes" rows={2} placeholder="Noter" />
                    <button type="submit" className="bg-bus text-white hover:bg-bus/90">Tilføj chaufføradgang</button>
                  </form>
                )}

                {user.organizationProfile || user.organizationMemberships.length > 0 ? (
                  <div className="rounded-2xl bg-cream p-4 text-sm">
                    <p className="flex items-center gap-2 font-extrabold text-ink"><Building2 size={16} /> Foreningsadgang aktiv</p>
                    <p className="mt-2 text-slate-600">{orgName}</p>
                  </div>
                ) : (
                  <form action={addOrganizationAccessToUserAction} className="grid gap-3 rounded-2xl bg-cream p-4">
                    <input type="hidden" name="userId" value={user.id} />
                    <p className="flex items-center gap-2 font-extrabold text-ink"><Building2 size={16} /> Tilføj forening</p>
                    <input name="organizationName" placeholder="Forening/institution" required />
                    <input name="organizationPhone" type="tel" placeholder="Telefon" defaultValue={defaultPhone} required />
                    <input name="organizationAddress" placeholder="Adresse" defaultValue={defaultAddress} required />
                    <button type="submit" className="bg-bus text-white hover:bg-bus/90">Tilføj foreningsadgang</button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
