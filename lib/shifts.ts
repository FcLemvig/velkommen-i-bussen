export function isRideWithinShift(rideTime: string, startTime: string, endTime: string) {
  return rideTime >= startTime && rideTime < endTime;
}

export function addHoursToTime(time: string, hours: number) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hour, minute);
  date.setHours(date.getHours() + hours);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
