import { BusName } from "@/lib/shifts";

const supersaasFeedUrl = "https://www.supersaas.dk/info/webcal/A594B7.ics";

export type SuperSaaSBooking = {
  id: string;
  bus: BusName;
  date: Date;
  startTime: string;
  endTime: string;
  title: string;
  organizer?: string;
  description?: string;
  url?: string;
};

function unfoldIcsLines(input: string) {
  return input.split(/\r?\n/).reduce<string[]>((lines, line) => {
    if (/^[ \t]/.test(line) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }

    return lines;
  }, []);
}

function decodeIcsText(value = "") {
  return value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function parseIcsDate(value?: string) {
  if (!value) return null;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/);
  if (!match) return null;

  let [, year, month, day, hour = "00", minute = "00"] = match;
  if (value.endsWith("Z")) {
    const instant = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Copenhagen",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant);
    const part = (type: string) => parts.find((p) => p.type === type)!.value;
    year = part("year");
    month = part("month");
    day = part("day");
    hour = part("hour");
    minute = part("minute");
  }
  return {
    date: new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
    time: `${hour}:${minute}`,
  };
}

function busFromDescription(description?: string): BusName {
  return description?.toLowerCase().includes("vest") ? "WEST" : "EAST";
}

function parseEvents(calendar: string) {
  const lines = unfoldIcsLines(calendar);
  const events: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }

    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }

    if (!current) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).split(";")[0];
    const value = line.slice(colonIndex + 1);
    current[key] = value;
  }

  return events;
}

export class CalendarUnavailableError extends Error {
  constructor() {
    super("Kalenderen kan ikke kontrolleres lige nu. Prøv igen om lidt.");
  }
}

export async function getSuperSaaSBookings(start: Date, end: Date): Promise<SuperSaaSBooking[]> {
  try {
    const response = await fetch(supersaasFeedUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new CalendarUnavailableError();
    }

    const calendar = await response.text();

    if (!calendar.includes("BEGIN:VCALENDAR") || !calendar.includes("END:VCALENDAR"))
      throw new CalendarUnavailableError();
    const bookings: SuperSaaSBooking[] = [];

    for (const event of parseEvents(calendar)) {
      const startDate = parseIcsDate(event.DTSTART);
      const endDate = parseIcsDate(event.DTEND);
      const description = decodeIcsText(event.DESCRIPTION);

      if (event.STATUS === "CANCELLED") continue;
      if (!startDate || !endDate || event.RRULE) throw new CalendarUnavailableError();
      // Split overnight and all-day bookings into daily intervals.
      for (let day = new Date(startDate.date); day <= endDate.date; day = new Date(day.getTime() + 86400000)) {
        if (day < start || day >= end) continue;
        const first = day.getTime() === startDate.date.getTime();
        const last = day.getTime() === endDate.date.getTime();
        const from = first ? startDate.time : "00:00";
        const until = last ? endDate.time : "24:00";
        if (from >= until) continue;
        bookings.push({
          id: "supersaas-" + (event.UID ?? event.DTSTART) + "-" + day.toISOString().slice(0, 10),
          bus: busFromDescription(description),
          date: day,
          startTime: from,
          endTime: until,
          title: decodeIcsText(event.SUMMARY) || "SuperSaaS booking",
          organizer: decodeIcsText(event.ORGANIZER),
          description,
          url: decodeIcsText(event.URL),
        });
      }
    }

    return bookings.sort(
      (left, right) => left.date.getTime() - right.date.getTime() || left.startTime.localeCompare(right.startTime),
    );
  } catch {
    throw new CalendarUnavailableError();
  }
}
