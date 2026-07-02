import Link from "next/link";
import { Bus } from "lucide-react";
import { loginAction } from "@/app/login/actions";
import { FormMessage } from "@/components/FormMessage";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 py-12">
      <div>
        <Bus className="mb-4 text-bus" size={34} />
        <h1 className="text-3xl font-extrabold text-ink">Log ind</h1>
        <p className="mt-2 text-slate-600">Fortsæt til din profil i Velkommen i Bussen.</p>
      </div>
      <form action={loginAction} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm">
        <FormMessage message={params.error} />
        <div className="grid gap-2">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-2">
          <label htmlFor="password">Adgangskode</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button type="submit" className="bg-bus text-white hover:bg-bus/90">
          Log ind
        </button>
      </form>
      <p className="text-sm text-slate-600">
        Har du ikke en profil?{" "}
        <Link href="/register" className="font-bold text-ink hover:text-bus">
          Opret dig her
        </Link>
      </p>
    </main>
  );
}
