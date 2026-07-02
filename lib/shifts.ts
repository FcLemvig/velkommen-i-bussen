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

export function shiftsOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA;
}
