export type AddressSuggestion = { id: string; tekst: string; type: string };

export async function searchAddresses(
  query: string,
  token: string,
  request: typeof fetch = fetch,
): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({ tekst: query, token, maksimum: "7" });
  const response = await request(`https://adressevaelger.dk/adresser/soeg?${params}`, {
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Adresseopslag er midlertidigt utilgængeligt.");
  const data = await response.json();
  if (data.status === "fejl" || !Array.isArray(data.fund)) throw new Error("Ugyldigt svar fra adressetjenesten.");
  return data.fund
    .filter((item: { titel?: unknown }) => typeof item.titel === "string")
    .slice(0, 7)
    .map((item: { id: string; titel: string; type: string }) => ({ id: item.id, tekst: item.titel, type: item.type }));
}
