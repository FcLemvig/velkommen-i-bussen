export const roles = ["CITIZEN", "DRIVER", "ADMIN"] as const;
export type Role = (typeof roles)[number];

export const rideStatuses = ["PENDING", "APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type RideStatus = (typeof rideStatuses)[number];

export function isRole(value: string): value is Role {
  return roles.includes(value as Role);
}

export function isRideStatus(value: string): value is RideStatus {
  return rideStatuses.includes(value as RideStatus);
}
