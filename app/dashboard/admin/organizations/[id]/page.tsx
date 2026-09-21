import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateOrganizationAction } from "@/app/dashboard/admin/organizations/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { organizationName } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

export default async function EditOrganizationPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const organization = await prisma.organizationProfile.findUnique({
    where: { id },
    include: { user: { include: { membership: true } } }
  });

  if (!organization) {
    notFound();
  }

  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Rediger forening</h1>
        <p className="mt-2 text-slate-600">Opdater profilens kontaktoplysninger og medlemsstatus.</p>
      </div>

      <form action={updateOrganizationAction.bind(null, organization.id)} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
        <FormMessage message={query.error} />
        <div className="grid gap-2">
          <label htmlFor="name">Navn på forening/institution</label>
          <input id="name" name="name" defaultValue={organizationName(organization)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={organization.user.email} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="phone">Telefon</label>
            <input id="phone" name="phone" type="tel" defaultValue={organization.phone} required />
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="address">Adresse</label>
          <input id="address" name="address" defaultValue={organization.address} required />
        </div>
        <div className="grid gap-2">
          <label htmlFor="membershipStatus">Medlemsstatus</label>
          <select id="membershipStatus" name="membershipStatus" defaultValue={organization.user.membership?.status ?? "PENDING_PAYMENT"}>
            <option value="PENDING_PAYMENT">Afventer betaling</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="PAUSED">Pause</option>
            <option value="ENDED">Afsluttet</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="bg-bus text-white hover:bg-bus/90">Gem ændringer</button>
          <Link href="/dashboard/admin/organizations" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
            <ArrowLeft size={16} /> Tilbage
          </Link>
        </div>
      </form>
    </main>
  );
}
