import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDriverAction } from "@/app/dashboard/admin/drivers/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditDriverPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const driver = await prisma.driverProfile.findUnique({
    where: { id },
    include: { user: true }
  });

  if (!driver) {
    notFound();
  }

  const action = updateDriverAction.bind(null, driver.id);

  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Rediger chauffør</h1>
        <p className="mt-2 text-slate-600">Opdater kontaktoplysninger og om chaufføren er aktiv.</p>
      </div>
      <form action={action} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
        <FormMessage message={query.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="name">Navn</label>
            <input id="name" name="name" defaultValue={driver.user.name} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={driver.user.email} required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="phone">Telefon</label>
            <input id="phone" name="phone" defaultValue={driver.phone ?? ""} />
          </div>
          <div className="grid gap-2">
            <label htmlFor="licenseNumber">Kørekortnummer</label>
            <input id="licenseNumber" name="licenseNumber" defaultValue={driver.licenseNumber ?? ""} />
          </div>
        </div>
        <div className="grid gap-3">
          <label htmlFor="image">Profilbillede</label>
          {driver.imageUrl ? (
            <img src={driver.imageUrl} alt={driver.user.name} className="h-20 w-20 rounded-full object-cover" />
          ) : null}
          <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" />
          <p className="text-xs text-slate-500">Upload et nyt billede for at erstatte det nuværende.</p>
        </div>
        <div className="grid gap-2">
          <label htmlFor="notes">Noter</label>
          <textarea id="notes" name="notes" rows={4} defaultValue={driver.notes ?? ""} />
        </div>
        <label className="flex items-center gap-2">
          <input className="h-4 w-4" type="checkbox" name="isActive" defaultChecked={driver.isActive} />
          Aktiv chauffør
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="bg-bus text-white hover:bg-bus/90">
            Gem ændringer
          </button>
          <Link href="/dashboard/admin/drivers" className="button border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
            Tilbage
          </Link>
        </div>
      </form>
    </main>
  );
}
