export const membershipStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Afventer betaling",
  ACTIVE: "Aktiv",
  PAUSED: "Pause",
  ENDED: "Afsluttet"
};

export function isMembershipActive(membership?: { status: string; endsAt: Date | null } | null) {
  if (!membership || membership.status !== "ACTIVE") {
    return false;
  }

  return !membership.endsAt || membership.endsAt >= new Date();
}

export function membershipLabel(membership?: { status: string; endsAt: Date | null } | null) {
  if (!membership) {
    return "Afventer betaling";
  }

  if (membership.status === "ACTIVE" && membership.endsAt && membership.endsAt < new Date()) {
    return "Udløbet";
  }

  return membershipStatusLabels[membership.status] ?? membership.status;
}
