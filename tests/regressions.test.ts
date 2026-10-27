import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { dateSchema, timeSchema, phoneSchema, rideRequestSchema } from "../lib/validation";
import { danishToday, hasDeparted } from "../lib/dates";
import { searchAddresses } from "../lib/addresses";
import { CalendarUnavailableError, getSuperSaaSBookings, getSuperSaaSCalendarDisplay } from "../lib/supersaas-calendar";

test("dates, times, telephone numbers and consent reject invalid input", () => {
  for (const value of ["not-a-date", "2026-02-30", "2025-02-29", "2026-13-01"])
    assert.equal(dateSchema.safeParse(value).success, false, value);
  assert.equal(dateSchema.safeParse("2028-02-29").success, true);
  for (const value of ["99:99", "24:00", "12:60", "1:30"])
    assert.equal(timeSchema.safeParse(value).success, false, value);
  assert.equal(timeSchema.safeParse("23:59").success, true);
  assert.equal(phoneSchema.safeParse("abcdefgh").success, false);
  assert.equal(phoneSchema.safeParse("+45 12 34 56 78").success, true);
  const base = {
    pickupAddress: "Testvej 1, 7620 Lemvig",
    destinationAddress: "Testvej 2, 7620 Lemvig",
    date: "2099-01-01",
    time: "12:30",
    passengers: 2,
    purpose: "Besøg",
  };
  const parsed = rideRequestSchema.parse({ ...base, includesMinors: "false", parentalConsent: "false" });
  assert.equal(parsed.includesMinors, false);
  assert.equal(parsed.parentalConsent, false);
  assert.equal(
    rideRequestSchema.safeParse({
      ...base,
      includesMinors: "on",
      parentalConsent: "false",
      guardianName: "Test",
      guardianPhone: "12345678",
    }).success,
    false,
  );
  assert.equal(rideRequestSchema.safeParse({ ...base, date: "2000-01-01" }).success, false);
});

test("calendar dates follow Copenhagen even near UTC midnight and DST", () => {
  assert.equal(danishToday(new Date("2026-10-21T22:30:00Z")), "2026-10-22");
  assert.equal(hasDeparted(new Date("2026-10-22"), "00:15", new Date("2026-10-21T22:30:00Z")), true);
  assert.equal(hasDeparted(new Date("2026-10-22"), "01:00", new Date("2026-10-21T22:30:00Z")), false);
});

test("Adressevælger request uses the new API and normalizes its response", async () => {
  const result = await searchAddresses("Testvej 1 & 2", "test-token", async (input) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://adressevaelger.dk");
    assert.equal(url.pathname, "/adresser/soeg");
    assert.equal(url.searchParams.get("tekst"), "Testvej 1 & 2");
    return Response.json({ fund: [{ id: "abc", titel: "Testvej 1, 7620 Lemvig", type: "adresse" }] });
  });
  assert.deepEqual(result, [{ id: "abc", tekst: "Testvej 1, 7620 Lemvig", type: "adresse" }]);
  await assert.rejects(searchAddresses("test", "test-token", async () => Response.json({ status: "fejl" })));
  await assert.rejects(searchAddresses("test", "test-token", async () => new Response("", { status: 503 })));
});

test("calendar outages never masquerade as an available bus", async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [
      () => Promise.reject(new Error("offline")),
      async () => new Response("", { status: 503 }),
      async () => new Response("<html>Unavailable</html>"),
    ]) {
      globalThis.fetch = response;
      await assert.rejects(
        getSuperSaaSBookings(new Date("2026-10-21"), new Date("2026-10-22")),
        CalendarUnavailableError,
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("calendar converts UTC times, splits overnight bookings and skips cancellations", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:overnight
DTSTART:20261021T210000Z
DTEND:20261022T010000Z
DESCRIPTION:Bus Vest
END:VEVENT
BEGIN:VEVENT
UID:cancelled
DTSTART:20261021T100000Z
DTEND:20261021T110000Z
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`);
  try {
    const result = await getSuperSaaSBookings(new Date("2026-10-21"), new Date("2026-10-23"));
    assert.deepEqual(
      result.map((b) => [b.date.toISOString().slice(0, 10), b.startTime, b.endTime, b.bus]),
      [
        ["2026-10-21", "23:00", "24:00", "WEST"],
        ["2026-10-22", "00:00", "03:00", "WEST"],
      ],
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("SuperSaaS subscription error is not a booking or proof of availability", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(`BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=Europe/Copenhagen:20261027T121200
DTEND;TZID=Europe/Copenhagen:20261101T121200
UID:s@supersaas.com
SUMMARY:Ikke tilladt
DESCRIPTION:Denne mulighed er kun tilgængelig for abonnenter
END:VEVENT
END:VCALENDAR`);
  try {
    const start = new Date("2026-10-26");
    const end = new Date("2026-11-02");
    await assert.rejects(getSuperSaaSBookings(start, end), CalendarUnavailableError);
    assert.deepEqual(await getSuperSaaSCalendarDisplay(start, end), { available: false, bookings: [] });
  } finally {
    globalThis.fetch = original;
  }
});

test("all migrations build a fresh database; recovery migration is repeatable", async () => {
  const db = new PGlite();
  try {
    const root = "prisma/migrations";
    for (const dir of readdirSync(root).sort()) {
      if (dir.endsWith(".toml")) continue;
      try {
        await db.exec(readFileSync(`${root}/${dir}/migration.sql`, "utf8"));
      } catch (error) {
        throw new Error(`Migration ${dir} failed`, { cause: error });
      }
    }
    await db.exec(readFileSync(`${root}/20260801000000_restore_missing_tables/migration.sql`, "utf8"));
    const tables = await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
    );
    const models = [...readFileSync("prisma/schema.prisma", "utf8").matchAll(/^model (\w+)/gm)].map((m) => m[1]);
    assert.deepEqual(tables.rows.map((r) => r.table_name).sort(), models.sort());
    const columns = await db.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name='DriverShift'",
    );
    assert.ok(columns.rows.some((r) => r.column_name === "bus"));
  } finally {
    await db.close();
  }
});
