import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateMembershipAction } from "@/app/dashboard/admin/citizens/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { membershipLabel, membershipTypeLabel } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

function MembershipForm({ userId, status }: { userId: string; status?: string }) {
  return (
    <form action={updateMembershipAction} className="grid gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="returnTo" value="organizations" />
      <input type="hidden" name="membershipType" value="ORGANIZATION" />
      <select name="membershipStatus" defaultValue={status ?? "PENDING_PAYMENT"} className="min-w-44">
        <option value="PENDING_PAYMENT">Afventer betaling</option>
        <option value="ACTIVE">Aktiv</option>
        <option value="PAUSED">Pause</option>
        <option value="ENDED">Afsluttet</option>
      </select>
      <button type="submit" className="border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
        Gem
      </button>
    </form>
  );
}

export default async function OrganizationsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const params = await searchParams;

  const organizations = await prisma.organizationProfile.findMany({
    orderBy: { user: { name: "asc" } },
    include: {
      user: { include: { membership: true } },
      _count: { select: { bookings: true } },
      bookings: {
        orderBy: [{ bookingDate: "desc" }, { startTime: "desc" }],
        take: 1
      }
    }
  });

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Foreninger og institutioner</h1>
          <p className="mt-2 text-slate-600">Oversigt over foreningsprofiler, busbookinger og medlemsbetaling.</p>
        </div>
        <Link href="/dashboard/admin" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <FormMessage message={params.error} />
      {params.success ? (
        <p className="rounded-2xl border border-fjord/30 bg-fjord/10 px-4 py-3 text-sm font-semibold text-ink">
          {params.success}
        </p>
      ) : null}

      <section className="grid gap-4 md:hidden">
        {organizations.map((organization) => {
          const latestBooking = organization.bookings[0];

          return (
            <article key={organization.id} className="rounded-[24px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-extrabold text-ink">{organization.user.name}</h2>
                <a href={`mailto:${organization.user.email}`} className="mt-1 block break-all text-sm text-slate-600">
                  {organization.user.email}
                </a>
              </div>

              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500">Telefon</dt>
                  <dd className="mt-1 font-semibold text-ink">{organization.phone}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500">Adresse</dt>
                  <dd className="mt-1 text-slate-700">{organization.address}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500">Bookinger</dt>
                  <dd className="mt-1 text-slate-700">{organization._count.bookings}</dd>
                </div>
              </dl>

              {latestBooking ? (
                <div className="mt-4 rounded-2xl bg-cream p-4 text-sm">
                  <p className="font-bold text-ink">Seneste booking</p>
                  <p className="mt-1 text-slate-700">
                    {latestBooking.bookingDate.toLocaleDateString("da-DK")} kl. {latestBooking.startTime}-{latestBooking.endTime}
                  </p>
                  <p className="mt-1 text-slate-600">{latestBooking.purpose}</p>
                  <span className="mt-2 inline-flex rounded-full bg-fjord/25 px-3 py-1.5 text-xs font-bold text-ink">
                    {latestBooking.status === "CANCELLED" ? "Annulleret" : "Bekræftet"}
                  </span>
                </div>
              ) : null}

              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-sm font-extrabold text-ink">
                  {membershipTypeLabel(organization.user.membership)} · {membershipLabel(organization.user.membership)}
                </p>
                <MembershipForm userId={organization.user.id} status={organization.user.membership?.status} />
              </div>
            </article>
          );
        })}
        {organizations.length === 0 ? (
          <div className="rounded-[24px] border-2 border-dashed border-fjord/25 bg-white p-7 text-center text-slate-500">
            Der er ingen foreningsprofiler endnu.
          </div>
        ) : null}
      </section>

      <section className="hidden overflow-x-auto rounded-[32px] border-2 border-fjord/25 bg-white shadow-sm md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Forening/institution</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Adresse</th>
              <th className="px-4 py-3">Medlemskab</th>
              <th className="px-4 py-3">Bookinger</th>
              <th className="px-4 py-3">Seneste booking</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {organizations.map((organization) => {
              const latestBooking = organization.bookings[0];

              return (
                <tr key={organization.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{organization.user.name}</div>
                    <div className="text-slate-500">{organization.user.email}</div>
                  </td>
                  <td className="px-4 py-3">{organization.phone}</td>
                  <td className="px-4 py-3">{organization.address}</td>
                  <td className="px-4 py-3">
                    <div className="mb-1 font-bold text-ink">{membershipTypeLabel(organization.user.membership)}</div>
                    <div className="mb-2 text-xs text-slate-500">{membershipLabel(organization.user.membership)}</div>
                    <MembershipForm userId={organization.user.id} status={organization.user.membership?.status} />
                  </td>
                  <td className="px-4 py-3">{organization._count.bookings}</td>
                  <td className="px-4 py-3">
                    {latestBooking ? (
                      <div className="grid gap-2">
                        <div>
                          {latestBooking.bookingDate.toLocaleDateString("da-DK")} kl. {latestBooking.startTime}-{latestBooking.endTime}
                        </div>
                        <div className="text-slate-600">{latestBooking.purpose}</div>
                        <span className="w-fit rounded-full bg-fjord/25 px-3 py-1.5 text-xs font-bold text-ink">
                          {latestBooking.status === "CANCELLED" ? "Annulleret" : "Bekræftet"}
                        </span>
                      </div>
                    ) : (
                      "Ingen bookinger endnu"
                    )}
                  </td>
                </tr>
              );
            })}
            {organizations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Der er ingen foreningsprofiler endnu.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
