import { RideStatus, Role } from "@/lib/domain";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  CITIZEN: "Borger",
  DRIVER: "Chauffør",
  ORGANIZATION: "Forening/institution"
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
  PENDING: "bg-bus/15 text-brown",
  APPROVED: "bg-fjord/20 text-ink",
  ASSIGNED: "bg-fjord/25 text-ink",
  IN_PROGRESS: "bg-ink/10 text-ink",
  COMPLETED: "bg-fjord/30 text-ink",
  CANCELLED: "bg-red-100 text-red-800"
};
