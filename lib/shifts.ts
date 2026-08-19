export function isRideWithinShift(rideTime: string, startTime: string, endTime: string) {
  return rideTime >= startTime && rideTime < endTime;
}

export const busOptions = ["EAST", "WEST"] as const;

export type BusName = (typeof busOptions)[number];

export const busLabels: Record<BusName, string> = {
  EAST: "Bus Øst",
  WEST: "Bus Vest"
};

export function addHoursToTime(time: string, hours: number) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hour, minute);
  date.setHours(date.getHours() + hours);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function addMinutesToDateAndTime(date: Date, time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  next.setMinutes(next.getMinutes() + minutes);

  return {
    date: new Date(next.getFullYear(), next.getMonth(), next.getDate()),
    time: `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`
  };
}

export function shiftsOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA;
}

export function preferredBusForAddress(address: string): BusName {
  const normalized = address.toLowerCase();
  const eastSignals = ["7660", "bækmarksbro", "baekmarksbro", "bøvling", "boevling", "møborg", "moeborg", "nees", "skalstrup"];
  const westSignals = ["7620", "lemvig", "fjaltring", "trans", "ramme"];

  if (eastSignals.some((signal) => normalized.includes(signal))) return "EAST";
  if (westSignals.some((signal) => normalized.includes(signal))) return "WEST";

  return "WEST";
}
