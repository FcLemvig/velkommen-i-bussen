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
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseIcsDate(value?: string) {
  if (!value) return null;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/);
  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00"] = match;
  return {
    date: new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
    time: `${hour}:${minute}`
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

export async function getSuperSaaSBookings(start: Date, end: Date): Promise<SuperSaaSBooking[]> {
  try {
    const response = await fetch(supersaasFeedUrl, {
      next: { revalidate: 60 * 45 }
    });

    if (!response.ok) {
      return [];
    }

    const calendar = await response.text();

    const bookings: SuperSaaSBooking[] = [];

    for (const event of parseEvents(calendar)) {
      const startDate = parseIcsDate(event.DTSTART);
      const endDate = parseIcsDate(event.DTEND);
      const description = decodeIcsText(event.DESCRIPTION);

      if (!startDate || !endDate || startDate.date < start || startDate.date >= end) {
        continue;
      }

      bookings.push({
        id: `supersaas-${event.UID ?? `${event.DTSTART}-${event.SUMMARY}`}`,
        bus: busFromDescription(description),
        date: startDate.date,
        startTime: startDate.time,
        endTime: endDate.time,
        title: decodeIcsText(event.SUMMARY) || "SuperSaaS booking",
        organizer: decodeIcsText(event.ORGANIZER),
        description,
        url: decodeIcsText(event.URL)
      });
    }

    return bookings.sort((left, right) => left.date.getTime() - right.date.getTime() || left.startTime.localeCompare(right.startTime));
  } catch {
    return [];
  }
}
