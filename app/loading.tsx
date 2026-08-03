import { Bus } from "lucide-react";

export default function Loading() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-4xl place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-[32px] border-2 border-fjord/20 bg-white p-6 text-center shadow-xl shadow-ink/10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-bus text-white shadow-lg shadow-bus/25">
          <Bus size={28} />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">Henter indhold</h1>
        <p className="mt-2 text-sm text-slate-600">Et øjeblik, så er siden klar.</p>
        <div className="mt-6 grid gap-3">
          <div className="h-4 animate-pulse rounded-full bg-fjord/20" />
          <div className="h-4 animate-pulse rounded-full bg-bus/20" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    </main>
  );
}
