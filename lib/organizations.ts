export function organizationName(profile: { name?: string | null; user: { name: string } }) {
  return profile.name?.trim() || profile.user.name;
}
