import Link from "next/link";
import { createDriverAction } from "@/app/dashboard/admin/drivers/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";

export default async function NewDriverPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser(["ADMIN"]);
  const params = await searchParams;

  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Ny chauffør</h1>
        <p className="mt-2 text-slate-600">Opret login og profiloplysninger for en frivillig chauffør.</p>
      </div>
      <form action={createDriverAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
        <FormMessage message={params.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="name">Navn</label>
            <input id="name" name="name" required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="phone">Telefon</label>
            <input id="phone" name="phone" />
          </div>
          <div className="grid gap-2">
            <label htmlFor="licenseNumber">Kørekortnummer</label>
            <input id="licenseNumber" name="licenseNumber" />
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="image">Profilbillede</label>
          <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" />
          <p className="text-xs text-slate-500">JPG, PNG eller WebP. Maks. 2 MB.</p>
        </div>
        <div className="grid gap-2">
          <label htmlFor="password">Midlertidig adgangskode</label>
          <input id="password" name="password" type="password" minLength={8} required />
        </div>
        <div className="grid gap-2">
          <label htmlFor="notes">Noter</label>
          <textarea id="notes" name="notes" rows={4} />
        </div>
        <label className="flex items-center gap-2">
          <input className="h-4 w-4" type="checkbox" name="isActive" defaultChecked />
          Aktiv chauffør
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="bg-fjord text-white hover:bg-fjord/90">
            Opret chauffør
          </button>
          <Link href="/dashboard/admin/drivers" className="button border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
            Annuller
          </Link>
        </div>
      </form>
    </main>
  );
}
