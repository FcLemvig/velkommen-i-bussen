"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">Vi kunne ikke afslutte handlingen</h1>
      <p className="my-4">
        Der kan være et midlertidigt problem med databasen eller bookingkalenderen. Tjek dine eksisterende bookinger,
        før du prøver igen. Kontakt kontoret, hvis problemet fortsætter.
      </p>
      <button onClick={reset}>Prøv igen</button>
    </main>
  );
}
