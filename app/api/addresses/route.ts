import { NextRequest, NextResponse } from "next/server";
import { searchAddresses } from "@/lib/addresses";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < 3 || query.length > 73)
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  // KDS recommends this public token until personal user management launches.
  // https://confluence.kds.dk/display/ADV/Brugerstyring
  const token = process.env.ADDRESS_LOOKUP_TOKEN?.trim() || "adressevaelger123";
  try {
    return NextResponse.json(await searchAddresses(query, token), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Adresseopslaget svarer ikke. Skriv hele adressen inklusive postnummer og by.",
      },
      { status: 503 },
    );
  }
}
