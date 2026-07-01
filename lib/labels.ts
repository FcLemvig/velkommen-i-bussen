import { RideStatus, Role } from "@/lib/domain";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  CITIZEN: "Borger",
  DRIVER: "Chauffør"
};

export const rideStatusLabels: Record<RideStatus, string> = {
  PENDING: "Afventer",
  APPROVED: "Godkendt",
  ASSIGNED: "Tildelt",
  IN_PROGRESS: "I gang",
  COMPLETED: "Gennemført",
  CANCELLED: "Annulleret"
};

export const rideStatusTone: Record<RideStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-900",
  APPROVED: "bg-blue-100 text-blue-900",
  ASSIGNED: "bg-teal-100 text-teal-900",
  IN_PROGRESS: "bg-indigo-100 text-indigo-900",
  COMPLETED: "bg-green-100 text-green-900",
  CANCELLED: "bg-red-100 text-red-900"
};
