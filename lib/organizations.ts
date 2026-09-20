export function organizationName(profile: { name?: string | null; user: { name: string } }) {
  return profile.name?.trim() || profile.user.name;
}

export function primaryOrganizationForUser<T extends { organizationProfile?: any; organizationMemberships?: Array<{ organizationProfile: any }> | null }>(
  user: T
) {
  return user.organizationProfile ?? user.organizationMemberships?.[0]?.organizationProfile ?? null;
}
